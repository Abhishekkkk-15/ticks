import { useEffect, useState } from 'react'
import { Check, Copy, Terminal, Shield, CheckSquare, Square } from 'lucide-react'
import { useSettings } from '../settings/SettingsContext'
import { listWorkspaces } from '../workspaces/api'
import { listNotes } from '../notes/api'
import type { Workspace } from '../workspaces/types'
import type { NoteListItem } from '../notes/types'

interface WorkspaceNotes {
  workspace: Workspace
  notes: NoteListItem[]
}

const ALL_TOOLS = [
  { name: 'list_workspaces', category: 'Read', description: 'Lists all available workspaces.' },
  { name: 'create_workspace', category: 'Write', description: 'Creates a new workspace.' },
  { name: 'delete_workspace', category: 'Write', description: 'Deletes a workspace and its contents.' },
  { name: 'list_notes', category: 'Read', description: 'Lists whitelisted note IDs, titles, and workspaces.' },
  { name: 'read_note', category: 'Read', description: 'Reads the complete text content of a permitted note.' },
  { name: 'search_notes', category: 'Read', description: 'Performs a full-text search across permitted notes.' },
  { name: 'read_drawing', category: 'Read', description: 'Reads Excalidraw JSON canvas data for a permitted note.' },
  { name: 'read_resource', category: 'Read', description: 'Reads asset files (images/PDFs) linked to a permitted note.' },
  { name: 'create_note', category: 'Write', description: 'Creates a new note (automatically auto-whitelisted).' },
  { name: 'update_note', category: 'Write', description: 'Overwrites the complete markdown content of a note.' },
  { name: 'patch_note', category: 'Write', description: 'Patches a specific block of text in a note.' },
  { name: 'delete_note', category: 'Write', description: 'Moves a note to the trash.' },
  { name: 'write_drawing', category: 'Write', description: 'Overwrites Excalidraw JSON canvas data for a note.' }
]

export default function MCPView(): React.JSX.Element {
  const { settings, updateSettings, loading: settingsLoading } = useSettings()
  const [workspaceNotesList, setWorkspaceNotesList] = useState<WorkspaceNotes[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [copied, setCopied] = useState(false)
  const [bridgePath, setBridgePath] = useState('<PATH_TO_TICKS>/resources/api/dist/Ticks-MCP-Bridge.bat')

  // Load workspaces and their notes
  useEffect(() => {
    async function loadData() {
      try {
        const workspaces = await listWorkspaces()
        const promises = workspaces.map(async (ws) => {
          const notes = await listNotes(ws.id)
          return { workspace: ws, notes }
        })
        const results = await Promise.all(promises)
        setWorkspaceNotesList(results)
      } catch (err) {
        console.error('Failed to load notes for MCP View:', err)
      } finally {
        setLoadingNotes(false)
      }
      
      try {
        const path = await window.api.getMcpBridgePath()
        // Format path for JSON by replacing single backslashes with double backslashes
        setBridgePath(path.replace(/\\/g, '\\\\'))
      } catch (err) {
        console.error('Failed to get bridge path:', err)
      }
    }
    loadData()
  }, [])

  if (settingsLoading || !settings) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 text-neutral-400">
        <span className="text-sm font-light">Loading MCP configuration...</span>
      </div>
    )
  }

  const sseUrl = 'http://localhost:8001/mcp/sse'

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sseUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Toggles a single note permission
  const handleToggleNote = (noteId: string) => {
    const currentList = settings.mcp_permitted_notes || []
    let newList: string[]
    if (currentList.includes(noteId)) {
      newList = currentList.filter((id) => id !== noteId)
    } else {
      newList = [...currentList, noteId]
    }
    updateSettings({ mcp_permitted_notes: newList })
  }

  // Grant all notes permission
  const handlePermitAllNotes = () => {
    const allNoteIds: string[] = []
    workspaceNotesList.forEach((group) => {
      group.notes.forEach((note) => {
        allNoteIds.push(note.id)
      })
    })
    updateSettings({ mcp_permitted_notes: allNoteIds })
  }

  // Revoke all notes permission
  const handleRevokeAllNotes = () => {
    updateSettings({ mcp_permitted_notes: [] })
  }

  // Toggles a single tool permission
  const handleToggleTool = (toolName: string) => {
    const currentList = settings.mcp_permitted_tools || []
    let newList: string[]
    if (currentList.includes(toolName)) {
      newList = currentList.filter((name) => name !== toolName)
    } else {
      newList = [...currentList, toolName]
    }
    updateSettings({ mcp_permitted_tools: newList })
  }

  // Enable all tools
  const handleEnableAllTools = () => {
    updateSettings({ mcp_permitted_tools: ALL_TOOLS.map((t) => t.name) })
  }

  // Disable all tools
  const handleDisableAllTools = () => {
    updateSettings({ mcp_permitted_tools: [] })
  }

  return (
    <div className="space-y-6">
        
        {/* Header Title Section */}
        <div className="border-b border-neutral-800 pb-5">
          <h1 className="text-xl font-semibold text-neutral-100 flex items-center gap-2">
            <Terminal className="text-amber-500 h-5 w-5" />
            Model Context Protocol (MCP) Server
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Expose permitted notes, drawings, and resources to your coding agents (e.g. Claude Desktop or Antigravity) via a secure SSE connection.
          </p>
        </div>

        {/* Server Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 space-y-4">
            <h2 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Server Status & Configuration
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-neutral-300">MCP SSE Connection URL</span>
                  <span className="text-[11px] font-mono text-neutral-500 break-all">{sseUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1 text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSettings({ mcp_enabled: !settings.mcp_enabled })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.mcp_enabled ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-neutral-950 shadow ring-0 transition duration-200 ease-in-out ${
                      settings.mcp_enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div className="text-xs">
                  <span className="block font-medium text-neutral-200">
                    {settings.mcp_enabled ? 'Server Active & Listening' : 'Server Stopped'}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {settings.mcp_enabled
                      ? 'Coding agents can connect and query allowed data.'
                      : 'All incoming MCP connections and requests will be blocked.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Claude Desktop Config
            </h3>
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Add this block to your <code className="text-neutral-400 font-mono">claude_desktop_config.json</code> under <code className="text-neutral-400 font-mono">mcpServers</code>. Replace the path with the actual installation path of your Ticks application:
            </p>
            <pre className="text-[9px] font-mono bg-neutral-950 p-2.5 rounded border border-neutral-900 text-amber-500/90 overflow-x-auto">
{`"mcpServers": {
  "ticks": {
    "command": "${bridgePath}",
    "args": []
  }
}`}
            </pre>
          </div>
        </div>

        {/* Permissions Management Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Notes Permissions Whitelist */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 flex flex-col h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 border-b border-neutral-800 pb-3 mb-3 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200">Notes Access Whitelist</h3>
                <p className="text-[10px] text-neutral-500">
                  Select which notes the agent can read and write.
                </p>
              </div>
              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handlePermitAllNotes}
                  className="text-amber-500 hover:text-amber-400 font-medium"
                >
                  Permit All
                </button>
                <span className="text-neutral-700">|</span>
                <button
                  type="button"
                  onClick={handleRevokeAllNotes}
                  className="text-neutral-500 hover:text-neutral-400 font-medium"
                >
                  Revoke All
                </button>
              </div>
            </div>

            {loadingNotes ? (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
                Loading notes list...
              </div>
            ) : workspaceNotesList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
                No notes found. Create some notes first!
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {workspaceNotesList.map((group) => {
                  if (group.notes.length === 0) return null
                  return (
                    <div key={group.workspace.id} className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                        {group.workspace.name}
                      </div>
                      <div className="space-y-1">
                        {group.notes.map((note) => {
                          const isPermitted = (settings.mcp_permitted_notes || []).includes(note.id)
                          return (
                            <button
                              type="button"
                              key={note.id}
                              onClick={() => handleToggleNote(note.id)}
                              className="w-full text-left flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-neutral-900 transition-colors group"
                            >
                              <span className="mt-0.5 text-neutral-500 group-hover:text-neutral-300">
                                {isPermitted ? (
                                  <CheckSquare size={13} className="text-amber-500" />
                                ) : (
                                  <Square size={13} />
                                )}
                              </span>
                              <div>
                                <span className="block text-xs font-medium text-neutral-300 group-hover:text-neutral-100">
                                  {note.title || 'Untitled Note'}
                                </span>
                                {note.folder && (
                                  <span className="text-[9px] text-neutral-500 block">
                                    Folder: {note.folder}
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tools Permission List */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 flex flex-col h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 border-b border-neutral-800 pb-3 mb-3 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200">Allowed Agent Tools</h3>
                <p className="text-[10px] text-neutral-500">
                  Select which capabilities the agent is allowed to execute.
                </p>
              </div>
              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleEnableAllTools}
                  className="text-amber-500 hover:text-amber-400 font-medium"
                >
                  Enable All
                </button>
                <span className="text-neutral-700">|</span>
                <button
                  type="button"
                  onClick={handleDisableAllTools}
                  className="text-neutral-500 hover:text-neutral-400 font-medium"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {ALL_TOOLS.map((tool) => {
                const isPermitted = (settings.mcp_permitted_tools || []).includes(tool.name)
                return (
                  <button
                    type="button"
                    key={tool.name}
                    onClick={() => handleToggleTool(tool.name)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg border border-neutral-900 hover:border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/40 transition-all group"
                  >
                    <span className="mt-1 text-neutral-500 group-hover:text-neutral-300">
                      {isPermitted ? (
                        <CheckSquare size={14} className="text-amber-500" />
                      ) : (
                        <Square size={14} />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-neutral-200 group-hover:text-amber-400">
                          {tool.name}
                        </span>
                        <span className={`text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                          tool.category === 'Write' 
                            ? 'bg-amber-500/10 text-amber-500' 
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {tool.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

    </div>
    </div>
  )
}
