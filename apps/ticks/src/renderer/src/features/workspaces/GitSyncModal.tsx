import { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle, AlertTriangle, Terminal, GitBranch } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface GitSyncModalProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}

export default function GitSyncModal({
  workspaceId,
  workspaceName,
  onClose
}: GitSyncModalProps): React.JSX.Element {
  const [remoteUrl, setRemoteUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [autoSyncOnSave, setAutoSyncOnSave] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [gitStatus, setGitStatus] = useState<{
    initialized: boolean;
    remote_url: string | null;
    branch: string;
    auto_sync_on_save: boolean;
    uncommitted_changes: string[];
    last_commit: string | null;
  } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [workspaceId]);

  async function fetchStatus(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any>(`/workspaces/${workspaceId}/sync/git`);
      setGitStatus(data);
      setRemoteUrl(data.remote_url || '');
      setBranch(data.branch || 'main');
      setAutoSyncOnSave(!!data.auto_sync_on_save);
      setAuthorName(data.author_name || '');
      setAuthorEmail(data.author_email || '');
      setLogs([`Git status loaded for workspace: ${workspaceName}`]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch git status');
      setLogs([`Error: ${err.message || 'Failed to fetch git status'}`]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      const data = await apiFetch<any>(`/workspaces/${workspaceId}/sync/git/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remote_url: remoteUrl.trim() || null,
          branch: branch.trim() || 'main',
          auto_sync_on_save: autoSyncOnSave,
          author_name: authorName.trim() || null,
          author_email: authorEmail.trim() || null
        })
      });
      setGitStatus(data);
      setLogs(prev => [...prev, 'Settings saved successfully']);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    }
  }

  async function handleSyncNow(): Promise<void> {
    setSyncing(true);
    setError(null);
    setLogs(prev => [...prev, 'Starting Git synchronization...']);
    try {
      const result = await apiFetch<any>(`/workspaces/${workspaceId}/sync/git/sync`, {
        method: 'POST'
      });
      
      const newLogs = [...logs, 'Sync process completed:'];
      if (result.committed) {
        newLogs.push('✓ Committed local changes to repository.');
      } else {
        newLogs.push('• No local changes to commit.');
      }
      
      if (result.pulled) {
        newLogs.push('✓ Pulled remote changes from origin.');
      }
      if (result.pushed) {
        newLogs.push('✓ Pushed local updates to origin.');
      }

      if (result.success === false && result.error) {
        newLogs.push(`❌ Synchronization failed: ${result.error}`);
        setError(result.error);
      } else if (result.conflict) {
        newLogs.push('⚠️ Merge conflict detected! Please resolve conflicts in the affected notes:');
        if (result.conflictedFiles && result.conflictedFiles.length > 0) {
          result.conflictedFiles.forEach((file: string) => {
            newLogs.push(`   - ${file}`);
          });
        }
      } else if (!result.pulled && !result.pushed && !result.committed) {
        newLogs.push('• Repository is already up to date.');
      } else {
        newLogs.push('✓ Synchronization finished successfully.');
      }
      
      setGitStatus(result.status);
      setLogs(newLogs);
    } catch (err: any) {
      setError(err.message || 'Synchronization failed');
      setLogs(prev => [...prev, `Sync failed: ${err.message || 'Unknown error'}`]);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-[600px] w-[650px] flex-col rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-neutral-100">
              Git Synchronization — {workspaceName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Loading settings…
            </div>
          ) : (
            <>
              {/* Status Section */}
              <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Repository Status</span>
                  <span className="flex items-center gap-1">
                    {gitStatus?.initialized ? (
                      <>
                        <CheckCircle size={12} className="text-emerald-500" />
                        <span className="text-emerald-400 font-medium">Initialized</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span className="text-amber-400 font-medium">Not Initialized</span>
                      </>
                    )}
                  </span>
                </div>
                
                {gitStatus?.initialized && (
                  <div className="text-xs text-neutral-300 space-y-1">
                    <div>
                      <span className="text-neutral-500">Last commit:</span>{' '}
                      {gitStatus.last_commit || 'None (New repository)'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Uncommitted files:</span>{' '}
                      {gitStatus.uncommitted_changes.length === 0 ? (
                        <span className="text-neutral-500">None</span>
                      ) : (
                        <span className="text-amber-400 font-medium">
                          {gitStatus.uncommitted_changes.length} modified files
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Section */}
              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="git-url" className="text-xs font-medium text-neutral-400">
                    Git Remote URL (SSH or HTTPS with embedded credentials)
                  </label>
                  <input
                    id="git-url"
                    type="text"
                    value={remoteUrl}
                    onChange={e => setRemoteUrl(e.target.value)}
                    placeholder="e.g. git@github.com:username/repo.git"
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="git-branch" className="text-xs font-medium text-neutral-400">
                      Sync Branch
                    </label>
                    <input
                      id="git-branch"
                      type="text"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id="auto-sync"
                      type="checkbox"
                      checked={autoSyncOnSave}
                      onChange={e => setAutoSyncOnSave(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-0"
                    />
                    <label htmlFor="auto-sync" className="text-xs font-medium text-neutral-300">
                      Auto-sync on save
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="git-author-name" className="text-xs font-medium text-neutral-400">
                      Author Name
                    </label>
                    <input
                      id="git-author-name"
                      type="text"
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="git-author-email" className="text-xs font-medium text-neutral-400">
                      Author Email
                    </label>
                    <input
                      id="git-author-email"
                      type="email"
                      value={authorEmail}
                      onChange={e => setAuthorEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-700 hover:bg-neutral-800 text-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    Save Configuration
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-950 px-4 py-1.5 text-xs font-medium transition-colors"
                  >
                    <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                </div>
              </form>

              {/* Logs Terminal */}
              <div className="rounded-md border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col h-[180px]">
                <div className="flex items-center gap-1 bg-neutral-900 px-3 py-1 text-[10px] font-medium text-neutral-400 border-b border-neutral-800">
                  <Terminal size={10} />
                  <span>Sync logs</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] text-neutral-400 space-y-1 select-text">
                  {logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md bg-red-950/40 border border-red-900/50 p-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
