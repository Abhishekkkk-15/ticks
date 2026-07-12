import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getWorkspaceDir } from './workspaceService.js';
import { GitSyncConfig } from '../types/workspace.js';

const CONFIG_FILENAME = 'config.json';
const GITIGNORE_CONTENT = `# Ticks sync ignore
.DS_Store
Thumbs.db
`;

function runCmd(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || stdout.trim() || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export async function executeGit(workspaceId: string, args: string[]): Promise<string> {
  const dir = getWorkspaceDir(workspaceId);
  return runCmd('git', args, dir);
}

export function isGitRepo(workspaceId: string): boolean {
  const dir = getWorkspaceDir(workspaceId);
  return fs.existsSync(path.join(dir, '.git'));
}

export async function getGitStatus(workspaceId: string) {
  const dir = getWorkspaceDir(workspaceId);
  const configPath = path.join(dir, CONFIG_FILENAME);
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  const gitSync: GitSyncConfig = config.git_sync || {
    remote_url: null,
    branch: 'main',
    auto_sync_on_save: false
  };

  const initialized = isGitRepo(workspaceId);
  if (!initialized) {
    return {
      initialized: false,
      remote_url: gitSync.remote_url || null,
      branch: gitSync.branch || 'main',
      auto_sync_on_save: !!gitSync.auto_sync_on_save,
      uncommitted_changes: [],
      last_commit: null
    };
  }

  let uncommitted_changes: string[] = [];
  try {
    const statusOut = await executeGit(workspaceId, ['status', '--porcelain']);
    uncommitted_changes = statusOut
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (e) {
    // Ignore
  }

  let last_commit: string | null = null;
  try {
    last_commit = await executeGit(workspaceId, ['log', '-n', '1', '--format=%h - %s (%ad)', '--date=relative']);
  } catch (e) {
    // Ignore (e.g. if new repo with no commits yet)
  }

  // Double check actual git remote URL
  let actualRemoteUrl = gitSync.remote_url || null;
  try {
    actualRemoteUrl = await executeGit(workspaceId, ['remote', 'get-url', 'origin']);
  } catch (e) {
    // Ignore
  }

  return {
    initialized: true,
    remote_url: actualRemoteUrl,
    branch: gitSync.branch || 'main',
    auto_sync_on_save: !!gitSync.auto_sync_on_save,
    uncommitted_changes,
    last_commit
  };
}

export async function configureGitRemote(workspaceId: string, syncConfig: GitSyncConfig) {
  const dir = getWorkspaceDir(workspaceId);
  const configPath = path.join(dir, CONFIG_FILENAME);
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  
  config.git_sync = {
    ...config.git_sync,
    ...syncConfig
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // If git is initialized, update the remote URL and branch
  if (isGitRepo(workspaceId)) {
    const remoteUrl = syncConfig.remote_url ? syncConfig.remote_url.trim() : null;
    if (remoteUrl) {
      try {
        await executeGit(workspaceId, ['remote', 'remove', 'origin']);
      } catch (e) {
        // Ignore if remote didn't exist
      }
      await executeGit(workspaceId, ['remote', 'add', 'origin', remoteUrl]);
    } else {
      try {
        await executeGit(workspaceId, ['remote', 'remove', 'origin']);
      } catch (e) {
        // Ignore
      }
    }
  }

  return getGitStatus(workspaceId);
}

export async function syncGit(workspaceId: string) {
  const dir = getWorkspaceDir(workspaceId);
  const status = await getGitStatus(workspaceId);
  const branch = status.branch || 'main';

  // 1. Initialize git repo if not already initialized
  if (!status.initialized) {
    await executeGit(workspaceId, ['init']);
    await executeGit(workspaceId, ['branch', '-m', branch]);
    
    // Create default .gitignore if not present
    const gitignorePath = path.join(dir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, GITIGNORE_CONTENT, 'utf-8');
    }
  }

  // 2. Setup local user identity if not configured globally/locally
  let hasUser = true;
  try {
    const username = await executeGit(workspaceId, ['config', 'user.name']);
    if (!username) hasUser = false;
  } catch (e) {
    hasUser = false;
  }

  if (!hasUser) {
    await executeGit(workspaceId, ['config', 'local', 'user.name', 'Ticks Sync']);
    await executeGit(workspaceId, ['config', 'local', 'user.email', 'sync@ticks.local']);
  }

  // 3. Ensure remote is correctly set in git configuration
  if (status.remote_url) {
    let currentRemote = '';
    try {
      currentRemote = await executeGit(workspaceId, ['remote', 'get-url', 'origin']);
    } catch (e) {
      // Ignore
    }
    if (currentRemote !== status.remote_url) {
      try {
        await executeGit(workspaceId, ['remote', 'remove', 'origin']);
      } catch (e) {
        // Ignore
      }
      await executeGit(workspaceId, ['remote', 'add', 'origin', status.remote_url]);
    }
  }

  // 4. Commit local changes
  let committed = false;
  const statusOut = await executeGit(workspaceId, ['status', '--porcelain']);
  if (statusOut.trim().length > 0) {
    await executeGit(workspaceId, ['add', '.']);
    const timestamp = new Date().toISOString();
    await executeGit(workspaceId, ['commit', '-m', `sync: update from Ticks ${timestamp}`]);
    committed = true;
  }

  // 5. Pull & Push if remote URL is configured
  let pulled = false;
  let pushed = false;
  let conflict = false;
  let conflictedFiles: string[] = [];
  let success = true;
  let errorMsg: string | null = null;

  if (status.remote_url) {
    try {
      // Check if remote branch exists by fetching first
      await executeGit(workspaceId, ['fetch', 'origin']);

      let remoteBranchExists = false;
      try {
        const branches = await executeGit(workspaceId, ['branch', '-r']);
        remoteBranchExists = branches.includes(`origin/${branch}`);
      } catch (e) {
        // Ignore
      }

      if (remoteBranchExists) {
        try {
          // Pull remote changes
          await executeGit(workspaceId, ['pull', 'origin', branch, '--no-edit']);
          pulled = true;
        } catch (err: any) {
          const errMsg = err.message || '';
          if (errMsg.toLowerCase().includes('conflict')) {
            conflict = true;
            // Retrieve list of conflicted files
            try {
              const diffOut = await executeGit(workspaceId, ['diff', '--name-only', '--diff-filter=U']);
              conflictedFiles = diffOut.split('\n').map(f => f.trim()).filter(f => f.length > 0);
            } catch (e) {
              // Ignore
            }
          } else {
            success = false;
            errorMsg = `Git pull failed: ${err.message}`;
          }
        }
      }

      // Push local changes (if no conflict is active and pull succeeded)
      if (!conflict && success) {
        try {
          await executeGit(workspaceId, ['push', '-u', 'origin', branch]);
          pushed = true;
        } catch (err: any) {
          success = false;
          errorMsg = `Git push failed: ${err.message}`;
        }
      }
    } catch (err: any) {
      success = false;
      errorMsg = `Git fetch failed: ${err.message}`;
    }
  }

  const updatedStatus = await getGitStatus(workspaceId);

  return {
    success: success && !conflict,
    error: errorMsg,
    committed,
    pulled,
    pushed,
    conflict,
    conflictedFiles,
    status: updatedStatus
  };
}
