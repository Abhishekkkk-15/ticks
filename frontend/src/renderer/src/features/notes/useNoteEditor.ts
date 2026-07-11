import { useCallback, useEffect, useRef, useState } from 'react'
import { getNote, updateNoteContent } from './api'
import type { NoteDetail } from './types'

import { useSettings } from '../settings/SettingsContext'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseNoteEditorResult {
  note: NoteDetail | null
  content: string
  onChange: (value: string) => void
  loading: boolean
  error: string | null
  saveStatus: SaveStatus
}

interface PendingSave {
  workspaceId: string
  noteId: string
  content: string
}

export function useNoteEditor(workspaceId: string, noteId: string): UseNoteEditorResult {
  const { settings } = useSettings()
  const autosaveDelay = settings?.autosave_delay ?? 800

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
      }, autosaveDelay)
    },
    [workspaceId, noteId, autosaveDelay]
  )

  useEffect(() => {
    function handleCapture(event: Event): void {
      const customEvent = event as CustomEvent<{ text: string }>
      const capturedText = customEvent.detail.text
      const separator = content.endsWith('\n') || content === '' ? '' : '\n\n'
      const newContent = content + separator + `> ${capturedText}\n`
      onChange(newContent)
    }

    window.addEventListener('shortcut:captured', handleCapture)
    return () => {
      window.removeEventListener('shortcut:captured', handleCapture)
    }
  }, [content, onChange])

  // A quick-capture AI action (App.tsx) saves its result straight through the
  // API rather than this hook's own onChange, since the note that received
  // the capture isn't necessarily the one currently open here — but if it IS
  // this note, the open editor needs to pick up the change too, or it'd keep
  // showing stale content until the note is reloaded. Sets local state
  // directly (not onChange) since the content was already persisted.
  useEffect(() => {
    function handleExternalUpdate(event: Event): void {
      const customEvent = event as CustomEvent<{ noteId: string; content: string }>
      if (customEvent.detail.noteId === noteId) {
        setContent(customEvent.detail.content)
      }
    }

    window.addEventListener('note:content-updated', handleExternalUpdate)
    return () => {
      window.removeEventListener('note:content-updated', handleExternalUpdate)
    }
  }, [noteId])

  return { note, content, onChange, loading, error, saveStatus }
}
