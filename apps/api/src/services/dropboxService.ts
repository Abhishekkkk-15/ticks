import crypto from 'crypto';
import fetch from 'node-fetch';
import { Dropbox } from 'dropbox';
import { getSettingsInfo, updateSettings, getDropboxToken, setDropboxToken, getDropboxCursor, setDropboxCursor } from './settingsService.js';
import { settings } from '../config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

let pkceVerifier: string | null = null;
const REDIRECT_URI = `http://localhost:${settings.port}/api/sync/dropbox/callback`;

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(str: string): Buffer {
  return crypto.createHash('sha256').update(str).digest();
}

export function getDropboxAuthUrl(): string {
  const settingsInfo = getSettingsInfo();
  if (!settingsInfo.dropbox_app_key) {
    throw new Error('Dropbox App Key is not configured.');
  }

  // Generate PKCE verifier and challenge
  pkceVerifier = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(sha256(pkceVerifier));

  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.searchParams.set('client_id', settingsInfo.dropbox_app_key);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('token_access_type', 'offline');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return url.toString();
}

export async function handleDropboxCallback(code: string): Promise<void> {
  const settingsInfo = getSettingsInfo();
  if (!settingsInfo.dropbox_app_key) {
    throw new Error('Dropbox App Key is not configured.');
  }
  if (!pkceVerifier) {
    throw new Error('PKCE verifier is missing. Please restart the auth flow.');
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('client_id', settingsInfo.dropbox_app_key);
  params.set('redirect_uri', REDIRECT_URI);
  params.set('code_verifier', pkceVerifier);

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox OAuth failed: ${errorText}`);
  }

  const data = await response.json() as any;
  if (data.refresh_token) {
    setDropboxToken(data.refresh_token);
  }
  pkceVerifier = null;
}

function getDropboxClient(): Dropbox {
  const settingsInfo = getSettingsInfo();
  const refreshToken = getDropboxToken();
  if (!settingsInfo.dropbox_app_key || !refreshToken) {
    throw new Error('Dropbox is not connected.');
  }
  return new Dropbox({
    clientId: settingsInfo.dropbox_app_key,
    refreshToken: refreshToken,
    fetch: fetch as any
  });
}

// ─── Sync Engine ─────────────────────────────────────────────────────────────

interface SyncState {
  files: Record<string, { mtimeMs: number; rev: string }>;
}

function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(settings.dropboxSyncStatePath)) {
      return JSON.parse(fs.readFileSync(settings.dropboxSyncStatePath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load sync state:', err);
  }
  return { files: {} };
}

function saveSyncState(state: SyncState): void {
  try {
    fs.writeFileSync(settings.dropboxSyncStatePath, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save sync state:', err);
  }
}

/** Recursively get all files in a local directory, relative to baseDir */
function getLocalFilesState(dir: string, baseDir: string, state: Record<string, { mtimeMs: number }> = {}): Record<string, { mtimeMs: number }> {
  if (!fs.existsSync(dir)) return state;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== '.git') {
        getLocalFilesState(fullPath, baseDir, state);
      }
    } else {
      if (file === 'dropbox-sync-state.json') continue; // Do not sync the local sync state
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      state[relPath] = { mtimeMs: stat.mtimeMs };
    }
  }
  return state;
}

function removeLocalPath(localPath: string): void {
  if (!fs.existsSync(localPath)) return;
  fs.rmSync(localPath, { recursive: true, force: true });
}

/** Remove empty directories bottom-up, never deleting rootDir or .git trees. */
function pruneEmptyDirectories(dir: string, rootDir: string): void {
  if (!fs.existsSync(dir)) return;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === '.git') continue;
    const fullPath = path.join(dir, name);
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        pruneEmptyDirectories(fullPath, rootDir);
      }
    } catch {
      // Path may have been removed concurrently
    }
  }
  if (path.resolve(dir) === path.resolve(rootDir)) return;
  try {
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch {
    // Ignore non-empty or already-removed dirs
  }
}

/** Prevents overlapping Smart/Push/Pull runs from racing on cursor and sync state. */
let syncInProgress = false;

export type SyncPhase = 'idle' | 'download' | 'upload' | 'delete' | 'done' | 'error';

export interface DropboxSyncProgress {
  running: boolean;
  mode: 'pull' | 'push' | 'smart' | null;
  phase: SyncPhase;
  currentFile: string | null;
  downloaded: number;
  uploaded: number;
  deletedRemote: number;
  deletedLocal: number;
  errors: string[];
  message: string;
}

const idleProgress = (): DropboxSyncProgress => ({
  running: false,
  mode: null,
  phase: 'idle',
  currentFile: null,
  downloaded: 0,
  uploaded: 0,
  deletedRemote: 0,
  deletedLocal: 0,
  errors: [],
  message: ''
});

let syncProgress: DropboxSyncProgress = idleProgress();

function resetSyncProgress(mode: 'pull' | 'push' | 'smart'): void {
  syncProgress = {
    ...idleProgress(),
    running: true,
    mode,
    phase: 'download',
    message: 'Starting sync…'
  };
}

function patchSyncProgress(patch: Partial<DropboxSyncProgress>): void {
  syncProgress = { ...syncProgress, ...patch };
}

function pushSyncError(error: string): void {
  const errors = [...syncProgress.errors, error].slice(-50);
  syncProgress = { ...syncProgress, errors };
}

export function isDropboxSyncInProgress(): boolean {
  return syncInProgress;
}

export function getDropboxSyncProgress(): DropboxSyncProgress {
  return { ...syncProgress, errors: [...syncProgress.errors] };
}

export async function triggerSync(options: { mode: 'pull' | 'push' | 'smart' } = { mode: 'smart' }): Promise<{
  success: boolean;
  message: string;
  errors?: string[];
}> {
  if (syncInProgress) {
    return {
      success: false,
      message: 'A Dropbox sync is already in progress. Please wait for it to finish.'
    };
  }

  syncInProgress = true;
  resetSyncProgress(options.mode);
  try {
    const dbx = getDropboxClient();
    const cursor = getDropboxCursor();
    const root = path.join(os.homedir(), 'AILearningWorkspace'); // Sync entire workspace including settings
    const REMOTE_PREFIX = '/Ticks';
    let rootRecreated = false;
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
      rootRecreated = true;
    }

    // Ensure workspaces subdirectory exists
    if (!fs.existsSync(settings.workspacesRoot)) {
      fs.mkdirSync(settings.workspacesRoot, { recursive: true });
    }

    const syncState = loadSyncState();
    
    // Safety net: if local root is empty or was deleted, and mode is smart, we should pull to be safe.
    let forceFullPull = false;
    const localFilesState = getLocalFilesState(root, root);
    if (options.mode === 'smart' && rootRecreated) {
      syncState.files = {};
      setDropboxCursor('');
      forceFullPull = true;
    }

    let remoteFilesProcessed = 0;
    let localFilesProcessed = 0;
    let localDeletesProcessed = 0;
    let remoteDeletesApplied = 0;

    // 1. Download Remote Changes
    if (options.mode === 'pull' || options.mode === 'smart') {
      patchSyncProgress({ phase: 'download', message: 'Downloading remote changes…' });
      let hasMore = true;
      const isFullRemoteList = options.mode === 'pull' || forceFullPull;
      let currentCursor = isFullRemoteList ? '' : cursor;
      const remotePresentFiles = new Set<string>();

      while (hasMore) {
        let response;
        if (currentCursor) {
          try {
            response = await dbx.filesListFolderContinue({ cursor: currentCursor });
          } catch (e: any) {
            try {
              response = await dbx.filesListFolder({ path: REMOTE_PREFIX, recursive: true });
            } catch (err: any) {
              response = { result: { entries: [], cursor: '', has_more: false } };
            }
          }
        } else {
          try {
            response = await dbx.filesListFolder({ path: REMOTE_PREFIX, recursive: true });
          } catch (err: any) {
            response = { result: { entries: [], cursor: '', has_more: false } };
          }
        }

        for (const entry of response.result.entries) {
          if (!entry.path_display) continue;
          // Strip the REMOTE_PREFIX to get the relative path
          const relativePath = entry.path_display.replace(new RegExp(`^${REMOTE_PREFIX}/`, 'i'), '');
          if (relativePath === entry.path_display) continue; // Skip if it doesn't match prefix
          if (relativePath === 'dropbox-sync-state.json') continue; // Ignore if it exists remotely
          
          const localPath = path.join(root, relativePath);

          if (entry['.tag'] === 'file') {
            if (isFullRemoteList) {
              remotePresentFiles.add(relativePath);
            }
            patchSyncProgress({
              currentFile: relativePath,
              message: `Downloading ${relativePath}`
            });
            try {
              fs.mkdirSync(path.dirname(localPath), { recursive: true });
              
              let targetPath = localPath;
              let targetRelPath = relativePath;
              
              if (options.mode === 'smart') {
                // Conflict Detection
                const currentLocal = localFilesState[relativePath];
                const savedLocal = syncState.files[relativePath];
                
                // If local file was modified since last sync, create a Conflicted Copy
                if (currentLocal && (!savedLocal || currentLocal.mtimeMs > savedLocal.mtimeMs)) {
                  const ext = path.extname(localPath);
                  const base = path.basename(localPath, ext);
                  const dir = path.dirname(localPath);
                  targetPath = path.join(dir, `${base} (Conflicted Copy)${ext}`);
                  targetRelPath = path.relative(root, targetPath).replace(/\\/g, '/');
                }
              }

              // Download the file
              const fileData = await dbx.filesDownload({ path: entry.path_display });
              const content = (fileData.result as any).fileBinary;
              
              if (content) {
                fs.writeFileSync(targetPath, content);
                const newStat = fs.statSync(targetPath);
                syncState.files[targetRelPath] = { mtimeMs: newStat.mtimeMs, rev: entry.rev };
                localFilesState[targetRelPath] = { mtimeMs: newStat.mtimeMs }; // Update local scan so we don't immediately upload it
                remoteFilesProcessed++;
                patchSyncProgress({ downloaded: remoteFilesProcessed });
              }
            } catch (err: any) {
              pushSyncError(`Download failed for ${relativePath}: ${err.message || err}`);
            }
          } else if (entry['.tag'] === 'folder') {
            try {
              fs.mkdirSync(localPath, { recursive: true });
            } catch (err: any) {
              pushSyncError(`Failed to create folder ${relativePath}: ${err.message || err}`);
            }
          } else if (entry['.tag'] === 'deleted') {
            patchSyncProgress({
              phase: 'delete',
              currentFile: relativePath,
              message: `Deleting local ${relativePath}`
            });
            try {
              removeLocalPath(localPath);
              delete syncState.files[relativePath];
              delete localFilesState[relativePath];
              remoteDeletesApplied++;
              patchSyncProgress({ deletedLocal: remoteDeletesApplied });
            } catch (err: any) {
              pushSyncError(`Local delete failed for ${relativePath}: ${err.message || err}`);
            }
          }
        }
        
        currentCursor = response.result.cursor;
        hasMore = response.result.has_more;
      }

      // Full listings omit deleted entries — mirror by removing local files absent remotely.
      if (isFullRemoteList) {
        patchSyncProgress({ phase: 'delete', message: 'Mirroring remote deletions…' });
        for (const relPath of Object.keys(localFilesState)) {
          if (remotePresentFiles.has(relPath)) continue;
          patchSyncProgress({
            currentFile: relPath,
            message: `Deleting local ${relPath}`
          });
          try {
            removeLocalPath(path.join(root, relPath));
            delete syncState.files[relPath];
            delete localFilesState[relPath];
            remoteDeletesApplied++;
            patchSyncProgress({ deletedLocal: remoteDeletesApplied });
          } catch (err: any) {
            pushSyncError(`Local delete failed for ${relPath}: ${err.message || err}`);
          }
        }
        for (const relPath of Object.keys(syncState.files)) {
          if (!remotePresentFiles.has(relPath)) {
            delete syncState.files[relPath];
          }
        }
        pruneEmptyDirectories(root, root);
      }
    }

    // 2. Push Local Deletions
    if (options.mode === 'push' || options.mode === 'smart') {
      patchSyncProgress({ phase: 'delete', message: 'Pushing local deletions…' });
      for (const relPath of Object.keys(syncState.files)) {
        if (!localFilesState[relPath]) {
          patchSyncProgress({
            currentFile: relPath,
            message: `Deleting remote ${relPath}`
          });
          try {
            await dbx.filesDeleteV2({ path: `${REMOTE_PREFIX}/${relPath}` });
            localDeletesProcessed++;
            patchSyncProgress({ deletedRemote: localDeletesProcessed });
          } catch (e: any) {
            const msg = e?.error?.error_summary || e?.message || String(e);
            // Ignore not found errors if it was already deleted remotely
            if (!/not_found|path_lookup/i.test(msg)) {
              pushSyncError(`Remote delete failed for ${relPath}: ${msg}`);
            }
          }
          delete syncState.files[relPath];
        }
      }
    }

    // 3. Push Local Changes (Batched)
    if (options.mode === 'push' || options.mode === 'smart') {
      patchSyncProgress({ phase: 'upload', message: 'Uploading local changes…' });
      const uploadPromises: Promise<void>[] = [];
      for (const relPath of Object.keys(localFilesState)) {
        const currentLocal = localFilesState[relPath];
        const savedLocal = syncState.files[relPath];

        if (options.mode === 'push' || !savedLocal || currentLocal.mtimeMs > savedLocal.mtimeMs) {
          const localPath = path.join(root, relPath);
          const remotePath = `${REMOTE_PREFIX}/${relPath}`;
          
          uploadPromises.push((async () => {
            patchSyncProgress({
              currentFile: relPath,
              message: `Uploading ${relPath}`
            });
            try {
              const content = fs.readFileSync(localPath);
              const uploadRes = await dbx.filesUpload({
                path: remotePath,
                contents: content,
                mode: { '.tag': 'overwrite' }
              });
              syncState.files[relPath] = { mtimeMs: currentLocal.mtimeMs, rev: uploadRes.result.rev };
              localFilesProcessed++;
              patchSyncProgress({ uploaded: localFilesProcessed });
            } catch (err: any) {
              pushSyncError(`Upload failed for ${relPath}: ${err.message || err}`);
            }
          })());

          // Concurrency limit of 5
          if (uploadPromises.length >= 5) {
            await Promise.all(uploadPromises);
            uploadPromises.length = 0;
          }
        }
      }
      
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }
    }

    // Update cursor so we only pull delta next time
    try {
      const finalResponse = await dbx.filesListFolderGetLatestCursor({ path: REMOTE_PREFIX, recursive: true });
      setDropboxCursor(finalResponse.result.cursor);
    } catch (e) {
      // If folder doesn't exist yet, we just ignore cursor
    }
    saveSyncState(syncState);
    updateSettings({ dropbox_last_synced_at: new Date().toISOString() });

    const errorCount = syncProgress.errors.length;
    const summary =
      `Sync complete. Downloaded: ${remoteFilesProcessed}, Uploaded: ${localFilesProcessed}, ` +
      `Deleted remote: ${localDeletesProcessed}, Deleted local: ${remoteDeletesApplied}` +
      (errorCount ? ` (${errorCount} file error${errorCount === 1 ? '' : 's'})` : '');

    patchSyncProgress({
      running: false,
      phase: errorCount ? 'error' : 'done',
      currentFile: null,
      message: summary,
      downloaded: remoteFilesProcessed,
      uploaded: localFilesProcessed,
      deletedRemote: localDeletesProcessed,
      deletedLocal: remoteDeletesApplied
    });

    return {
      success: true,
      message: summary,
      errors: [...syncProgress.errors]
    };

  } catch (error: any) {
    console.error('Dropbox Sync Error:', error);
    const message = error.message || 'Unknown sync error';
    patchSyncProgress({
      running: false,
      phase: 'error',
      currentFile: null,
      message
    });
    return { success: false, message, errors: [...syncProgress.errors] };
  } finally {
    syncInProgress = false;
    if (syncProgress.running) {
      patchSyncProgress({ running: false });
    }
  }
}
