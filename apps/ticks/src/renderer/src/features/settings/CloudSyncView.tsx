import React, { useState } from 'react'
import { Cloud, Check, Loader2, RefreshCw, DownloadCloud, UploadCloud } from 'lucide-react'
import { useSettings } from './SettingsContext'
import { apiFetch } from '../../lib/api'

export default function CloudSyncView(): React.JSX.Element {
  const { settings, updateSettings } = useSettings()
  const [appKeyDraft, setAppKeyDraft] = useState(settings?.dropbox_app_key || '')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  if (!settings) return <div />

  const isConnected = settings.dropbox_connected

  async function handleConnect() {
    if (!appKeyDraft.trim()) return
    await updateSettings({ dropbox_app_key: appKeyDraft.trim() })
    
    setConnecting(true)
    try {
      const res = await apiFetch<{ url: string }>('/api/sync/dropbox/auth-url')
      if (res.url) {
        window.open(res.url, '_blank')
      }
    } catch (e: any) {
      alert(`Failed to get auth URL: ${e.message}`)
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync(mode: 'pull' | 'push' | 'smart') {
    setSyncing(true)
    setSyncMessage(mode === 'pull' ? 'Pulling...' : mode === 'push' ? 'Pushing...' : 'Syncing...')
    try {
      const res = await apiFetch<{ message: string }>('/api/sync/dropbox/trigger', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      setSyncMessage(res.message || 'Sync successful!')
    } catch (e: any) {
      setSyncMessage(`Sync failed: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="mb-1 text-base font-semibold text-neutral-100 flex items-center gap-2">
          <Cloud size={20} className="text-amber-500" />
          Cloud Sync (Dropbox)
        </h2>
        <p className="text-xs text-neutral-400">
          Sync all your workspaces across devices seamlessly. 
          Provide your own free Dropbox App Key to keep things 100% private.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-200">1. Setup Dropbox</h3>
        
        <div className="space-y-3">
          <label className="block text-xs font-medium text-neutral-400">Dropbox App Key (Client ID)</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={appKeyDraft}
              onChange={(e) => setAppKeyDraft(e.target.value)}
              placeholder="e.g. 5x2y8z9w1..."
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-neutral-500">
            Create an app at <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">Dropbox Developer Console</a> with "Full Dropbox" access, and add <code>http://localhost:8000/api/sync/dropbox/callback</code> as a Redirect URI.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-200">2. Connection</h3>
        
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={!appKeyDraft.trim() || connecting}
            className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
            Connect to Dropbox
          </button>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <Check size={16} />
              Connected to Dropbox
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.dropbox_auto_sync}
                onChange={(e) => updateSettings({ dropbox_auto_sync: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-950"
              />
              <span className="text-sm text-neutral-300">Auto-sync periodically</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.sync_on_close}
                onChange={(e) => updateSettings({ sync_on_close: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-950"
              />
              <span className="text-sm text-neutral-300">Sync when app closes</span>
            </label>


            <div className="pt-2 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleSync('smart')}
                  disabled={syncing}
                  className="flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  Smart Sync
                </button>
                <button
                  onClick={() => handleSync('pull')}
                  disabled={syncing}
                  className="flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:opacity-50"
                  title="Download all files from Dropbox, overwriting local files"
                >
                  <DownloadCloud size={16} />
                  Pull from Cloud
                </button>
                <button
                  onClick={() => handleSync('push')}
                  disabled={syncing}
                  className="flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:opacity-50"
                  title="Upload all local files to Dropbox, overwriting remote files"
                >
                  <UploadCloud size={16} />
                  Push to Cloud
                </button>
              </div>
              
              {syncMessage && (
                <span className="text-xs text-neutral-400">{syncMessage}</span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
