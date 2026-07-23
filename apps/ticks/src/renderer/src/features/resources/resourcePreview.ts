import type { Resource } from './types'

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported'
export type PreviewMode = 'split' | 'fullscreen'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])
const TEXT_EXTS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'log',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'ts',
  'tsx',
  'jsx',
  'yml',
  'yaml',
  'toml',
  'ini',
  'cfg',
  'conf'
])

export function getExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename
  const parts = base.split('.')
  if (parts.length < 2) return ''
  return parts.pop()!.toLowerCase()
}

export function getPreviewKind(filename: string): PreviewKind {
  const ext = getExtension(filename)
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (TEXT_EXTS.has(ext)) return 'text'
  return 'unsupported'
}

/** Local uploads only — website/blog and URL-sourced markdown are excluded. */
export function isLocalFileResource(resource: Resource): boolean {
  if (resource.type === 'website' || resource.type === 'blog') return false
  if (/^https?:\/\//i.test(resource.source)) return false
  return true
}

export function resourceFilePath(
  workspaceId: string,
  noteId: string,
  resourceId: string
): string {
  return `/workspaces/${workspaceId}/notes/${noteId}/resources/${resourceId}/file`
}

export async function resourceFileUrl(
  workspaceId: string,
  noteId: string,
  resourceId: string
): Promise<string> {
  const baseUrl = await window.api.getApiBaseUrl()
  return `${baseUrl}${resourceFilePath(workspaceId, noteId, resourceId)}`
}
