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

/** Recursively get all files in a local directory, relative to baseDir */
function getLocalFiles(dir: string, baseDir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== '.git') {
        getLocalFiles(fullPath, baseDir, fileList);
      }
    } else {
      fileList.push(path.relative(baseDir, fullPath));
    }
  }
  return fileList;
}

export async function triggerSync(): Promise<{ success: boolean; message: string }> {
  try {
    const dbx = getDropboxClient();
    const cursor = getDropboxCursor();
    const root = settings.workspacesRoot;
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }

    // 1. Download Remote Changes
    let hasMore = true;
    let currentCursor = cursor;
    let remoteFilesProcessed = 0;

    while (hasMore) {
      let response;
      if (currentCursor) {
        try {
          response = await dbx.filesListFolderContinue({ cursor: currentCursor });
        } catch (e: any) {
          // If cursor is invalid (e.g. reset), fall back to listFolder
          response = await dbx.filesListFolder({ path: '', recursive: true });
        }
      } else {
        response = await dbx.filesListFolder({ path: '', recursive: true });
      }

      for (const entry of response.result.entries) {
        if (entry['.tag'] === 'file' && entry.path_display) {
          const relativePath = entry.path_display.replace(/^\//, ''); // remove leading slash
          const localPath = path.join(root, relativePath);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });

          // Download the file
          const fileData = await dbx.filesDownload({ path: entry.path_display });
          const content = (fileData.result as any).fileBinary;
          
          if (content) {
            fs.writeFileSync(localPath, content);
            remoteFilesProcessed++;
          }
        } else if (entry['.tag'] === 'deleted' && entry.path_display) {
          const relativePath = entry.path_display.replace(/^\//, '');
          const localPath = path.join(root, relativePath);
          if (fs.existsSync(localPath)) {
            fs.rmSync(localPath);
          }
        }
      }
      
      currentCursor = response.result.cursor;
      hasMore = response.result.has_more;
    }

    // 2. Upload Local Changes
    const localFiles = getLocalFiles(root, root);
    let localFilesProcessed = 0;

    for (const relPath of localFiles) {
      const localPath = path.join(root, relPath);
      const content = fs.readFileSync(localPath);
      const remotePath = '/' + relPath.replace(/\\/g, '/');

      // We should only upload if local file is newer, but for simplicity
      // in this V1, we'll upload if it differs or we can use overwrite mode.
      // Dropbox filesUpload with mode='overwrite'
      await dbx.filesUpload({
        path: remotePath,
        contents: content,
        mode: { '.tag': 'overwrite' }
      });
      localFilesProcessed++;
    }

    // Update cursor so we only pull delta next time
    const finalResponse = await dbx.filesListFolderGetLatestCursor({ path: '', recursive: true });
    setDropboxCursor(finalResponse.result.cursor);

    return { 
      success: true, 
      message: `Sync complete. Downloaded ${remoteFilesProcessed} files, uploaded ${localFilesProcessed} files.` 
    };

  } catch (error: any) {
    console.error('Dropbox Sync Error:', error);
    return { success: false, message: error.message || 'Unknown sync error' };
  }
}
