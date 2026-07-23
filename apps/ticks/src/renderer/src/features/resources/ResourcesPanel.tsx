import { useState } from 'react'
import {
  Columns2,
  ExternalLink,
  FileText,
  Globe,
  Maximize2,
  Trash2,
  Upload
} from 'lucide-react'
import { useResources } from './useResources'
import { isLocalFileResource, type PreviewMode } from './resourcePreviewUtils'
import type { Resource, ResourceType } from './types'

interface ResourcesPanelProps {
  workspaceId: string
  noteId: string
  onOpenPreview?: (resource: Resource, mode: PreviewMode) => void
  onResourceRemoved?: (resourceId: string) => void
}

const TYPE_ICONS: Record<ResourceType, typeof Globe> = {
  website: Globe,
  blog: Globe,
  doc: FileText,
  pdf: FileText,
  markdown: FileText,
  file: FileText
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'text-neutral-500',
  reading: 'text-amber-400',
  processing: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400'
}

function inferTypeFromFilename(name: string): ResourceType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'doc' || ext === 'docx') return 'doc'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  return 'file'
}

function ResourcesPanel({
  workspaceId,
  noteId,
  onOpenPreview,
  onResourceRemoved
}: ResourcesPanelProps): React.JSX.Element {
  const { resources, loading, error, addUrl, addFile, remove } = useResources(workspaceId, noteId)
  const [urlType, setUrlType] = useState<ResourceType>('website')
  const [url, setUrl] = useState('')
  const [urlTitle, setUrlTitle] = useState('')

  async function handleAddUrl(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const source = url.trim()
    const title = urlTitle.trim() || source
    if (!source) return
    setUrl('')
    setUrlTitle('')
    await addUrl(urlType, source, title)
  }

  async function handleAttachFile(): Promise<void> {
    const picked = await window.api.pickResourceFile()
    if (!picked) return
    const title = picked.name.replace(/\.[^.]+$/, '')
    await addFile(inferTypeFromFilename(picked.name), title, picked.name, picked.data)
  }

  return (
    <div className="border-b border-neutral-800 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Resources
        </span>
        <button
          type="button"
          onClick={handleAttachFile}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        >
          <Upload size={12} /> Attach file
        </button>
      </div>

      {loading ? (
        <div className="py-2 text-xs text-neutral-500">Loading…</div>
      ) : resources.length === 0 ? (
        <div className="py-2 text-xs text-neutral-500">No resources attached yet</div>
      ) : (
        <ul className="mb-2 space-y-1">
          {resources.map((resource) => {
            const Icon = TYPE_ICONS[resource.type]
            const local = isLocalFileResource(resource)
            return (
              <li
                key={resource.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 ${
                  local && onOpenPreview ? 'cursor-pointer' : ''
                }`}
                onClick={() => {
                  if (local && onOpenPreview) onOpenPreview(resource, 'split')
                }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Icon size={13} className="shrink-0" />
                  <span className="truncate">{resource.title}</span>
                </span>
                <span className={`shrink-0 ${STATUS_STYLES[resource.status]}`}>
                  {resource.status}
                </span>
                {(resource.type === 'website' || resource.type === 'blog') && (
                  <a
                    href={resource.source}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-neutral-500 hover:text-neutral-300"
                    aria-label={`Open ${resource.title}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
                {local && onOpenPreview && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenPreview(resource, 'split')
                      }}
                      aria-label={`Preview ${resource.title} in split view`}
                      title="Split preview"
                      className="shrink-0 text-neutral-500 hover:text-neutral-300"
                    >
                      <Columns2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenPreview(resource, 'fullscreen')
                      }}
                      aria-label={`Preview ${resource.title} fullscreen`}
                      title="Fullscreen preview"
                      className="shrink-0 text-neutral-500 hover:text-neutral-300"
                    >
                      <Maximize2 size={12} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void remove(resource.id)
                      .then(() => onResourceRemoved?.(resource.id))
                      .catch(() => {
                        // error already surfaced via useResources
                      })
                  }}
                  aria-label={`Remove ${resource.title}`}
                  className="hidden shrink-0 text-neutral-500 hover:text-red-400 group-hover:inline"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={handleAddUrl} className="flex items-center gap-1">
        <select
          value={urlType}
          onChange={(event) => setUrlType(event.target.value as ResourceType)}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-xs text-neutral-200 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
        >
          <option value="website">Website</option>
          <option value="blog">Blog</option>
          <option value="markdown">Markdown URL</option>
        </select>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
        />
        <input
          value={urlTitle}
          onChange={(event) => setUrlTitle(event.target.value)}
          placeholder="Title (optional)"
          className="w-28 shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          Add
        </button>
      </form>

      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export default ResourcesPanel
