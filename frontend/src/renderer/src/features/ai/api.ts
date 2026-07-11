import { streamText } from '../../lib/api'

export type AiAction =
  | 'summarize'
  | 'explain'
  | 'key-points'
  | 'questions'
  | 'flashcards'
  | 'checklist'
  | 'table'
  | 'style'

export type RewriteMode = 'expand' | 'shorten' | 'examples' | 'format'

const REWRITE_MODES: ReadonlySet<string> = new Set(['expand', 'shorten', 'examples', 'format'])

export function isRewriteMode(action: string): action is RewriteMode {
  return REWRITE_MODES.has(action)
}

export interface AiNoteContext {
  workspaceId: string
  noteId: string
}

export function streamAiAction(
  action: AiAction,
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  context?: AiNoteContext
): Promise<void> {
  return streamText(
    `/ai/${action}`,
    { text, workspace_id: context?.workspaceId, note_id: context?.noteId },
    onChunk,
    signal
  )
}

export function streamAiRewrite(
  text: string,
  mode: RewriteMode,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  context?: AiNoteContext
): Promise<void> {
  return streamText(
    '/ai/rewrite',
    { text, mode, workspace_id: context?.workspaceId, note_id: context?.noteId },
    onChunk,
    signal
  )
}

export function stripMarkdownWrappers(text: string): string {
  const cleaned = text.trim()
  const match = cleaned.match(/^```markdown\s*([\s\S]*?)\s*```$/i)
  if (match) {
    return match[1].trim()
  }
  const generalMatch = cleaned.match(/^```(?:[a-z]+)?\s*([\s\S]*?)\s*```$/i)
  if (generalMatch) {
    return generalMatch[1].trim()
  }
  return cleaned
}

