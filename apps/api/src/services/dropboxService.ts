import crypto from 'crypto';
import fetch from 'node-fetch';
import { Dropbox } from 'dropbox';
import { getSettingsInfo, updateSettings, getDropboxToken, setDropboxToken, getDropboxCursor, setDropboxCursor } from './settingsService.js';
import { settings } from '../config.js';
import fs from 'fs';
import path from 'path';

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

export async function triggerSync(options: { mode: 'pull' | 'push' | 'smart' } = { mode: 'smart' }): Promise<{ success: boolean; message: string }> {
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

    // 1. Download Remote Changes
    if (options.mode === 'pull' || options.mode === 'smart') {
      let hasMore = true;
      let currentCursor = (options.mode === 'pull' || forceFullPull) ? '' : cursor;

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
            }
          } else if (entry['.tag'] === 'deleted') {
            if (fs.existsSync(localPath)) {
              fs.rmSync(localPath);
            }
            delete syncState.files[relativePath];
            delete localFilesState[relativePath];
          }
        }
        
        currentCursor = response.result.cursor;
        hasMore = response.result.has_more;
      }
    }

    // 2. Push Local Deletions
    if (options.mode === 'push' || options.mode === 'smart') {
      for (const relPath of Object.keys(syncState.files)) {
        if (!localFilesState[relPath]) {
          try {
            await dbx.filesDeleteV2({ path: `${REMOTE_PREFIX}/${relPath}` });
            localDeletesProcessed++;
          } catch (e: any) {
            // Ignore not found errors if it was already deleted remotely
          }
          delete syncState.files[relPath];
        }
      }
    }

    // 3. Push Local Changes (Batched)
    if (options.mode === 'push' || options.mode === 'smart') {
      const uploadPromises: Promise<void>[] = [];
      for (const relPath of Object.keys(localFilesState)) {
        const currentLocal = localFilesState[relPath];
        const savedLocal = syncState.files[relPath];

        if (options.mode === 'push' || !savedLocal || currentLocal.mtimeMs > savedLocal.mtimeMs) {
          const localPath = path.join(root, relPath);
          const remotePath = `${REMOTE_PREFIX}/${relPath}`;
          
          uploadPromises.push((async () => {
            const content = fs.readFileSync(localPath);
            const uploadRes = await dbx.filesUpload({
              path: remotePath,
              contents: content,
              mode: { '.tag': 'overwrite' }
            });
            syncState.files[relPath] = { mtimeMs: currentLocal.mtimeMs, rev: uploadRes.result.rev };
            localFilesProcessed++;
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

    return { 
      success: true, 
      message: `Sync complete. Downloaded: ${remoteFilesProcessed}, Uploaded: ${localFilesProcessed}, Deleted remote: ${localDeletesProcessed}` 
    };

  } catch (error: any) {
    console.error('Dropbox Sync Error:', error);
    return { success: false, message: error.message || 'Unknown sync error' };
  }
}
