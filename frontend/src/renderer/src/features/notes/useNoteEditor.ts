import { useCallback, useEffect, useRef, useState } from 'react'
import { getNote, updateNoteContent } from './api'
import type { NoteDetail } from './types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseNoteEditorResult {
  note: NoteDetail | null
  content: string
  onChange: (value: string) => void
  loading: boolean
  error: string | null
  saveStatus: SaveStatus
}

const AUTOSAVE_DELAY_MS = 800

interface PendingSave {
  workspaceId: string
  noteId: string
  content: string
}

export function useNoteEditor(workspaceId: string, noteId: string): UseNoteEditorResult {
  const [note, setNote] = useState<NoteDetail | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingSaveRef = useRef<PendingSave | null>(null)

  const flushPendingSave = useCallback(() => {
    const pending = pendingSaveRef.current
    if (!pending) return
    pendingSaveRef.current = null
    clearTimeout(saveTimerRef.current)
    updateNoteContent(pending.workspaceId, pending.noteId, pending.content).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      setSaveStatus('idle')
      try {
        const data = await getNote(workspaceId, noteId)
        if (cancelled) return
        setNote(data)
        setContent(data.content)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load note')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      flushPendingSave()
    }
  }, [workspaceId, noteId, flushPendingSave])

  const onChange = useCallback(
    (value: string) => {
      setContent(value)
      pendingSaveRef.current = { workspaceId, noteId, content: value }
      setSaveStatus('saving')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const pending = pendingSaveRef.current
        if (!pending) return
        pendingSaveRef.current = null
        try {
          await updateNoteContent(pending.workspaceId, pending.noteId, pending.content)
          setSaveStatus('saved')
        } catch {
          setSaveStatus('error')
        }
      }, AUTOSAVE_DELAY_MS)
    },
    [workspaceId, noteId]
  )

  return { note, content, onChange, loading, error, saveStatus }
}
