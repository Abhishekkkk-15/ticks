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

export type RewriteMode = 'expand' | 'shorten' | 'examples'

const REWRITE_MODES: ReadonlySet<string> = new Set(['expand', 'shorten', 'examples'])

export function isRewriteMode(action: string): action is RewriteMode {
  return REWRITE_MODES.has(action)
}

export function streamAiAction(
  action: AiAction,
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return streamText(`/ai/${action}`, { text }, onChunk, signal)
}

export function streamAiRewrite(
  text: string,
  mode: RewriteMode,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return streamText('/ai/rewrite', { text, mode }, onChunk, signal)
}
