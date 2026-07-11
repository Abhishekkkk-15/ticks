import { useCallback, useRef, useState } from 'react'
import { isRewriteMode, streamAiAction, streamAiRewrite, stripMarkdownWrappers } from './api'
import type { AiAction, AiNoteContext } from './api'

interface UseAiActionResult {
  result: string
  loading: boolean
  error: string | null
  run: (action: AiAction | string, text: string, context?: AiNoteContext) => Promise<void>
  reset: () => void
  cancel: () => void
}

export function useAiAction(): UseAiActionResult {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const run = useCallback(
    async (action: AiAction | string, text: string, context?: AiNoteContext) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setResult('')
      setError(null)
      setLoading(true)

      const onChunk = (chunk: string): void => setResult((prev) => prev + chunk)

      try {
        if (isRewriteMode(action)) {
          await streamAiRewrite(text, action, onChunk, controller.signal, context)
        } else {
          await streamAiAction(action as AiAction, text, onChunk, controller.signal, context)
        }
        setResult((prev) => stripMarkdownWrappers(prev))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'AI request failed')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setResult('')
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    setLoading(false)
  }, [])

  return { result, loading, error, run, reset, cancel }
}
