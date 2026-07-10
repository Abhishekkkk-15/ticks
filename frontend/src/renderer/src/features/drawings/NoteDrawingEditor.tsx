import { useEffect, useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import DrawingCanvas from './DrawingCanvas'
import { getNoteDrawing, saveDrawingScene } from './noteDrawingsApi'

type SceneElements = ReturnType<ExcalidrawImperativeAPI['getSceneElements']>
type SceneAppState = ReturnType<ExcalidrawImperativeAPI['getAppState']>
type BinaryFileList = Parameters<ExcalidrawImperativeAPI['addFiles']>[0]

interface NoteDrawingEditorProps {
  workspaceId: string
  noteId: string
  drawingId: string
  title: string
  onClose: () => void
}

function NoteDrawingEditor({
  workspaceId,
  noteId,
  drawingId,
  title,
  onClose
}: NoteDrawingEditorProps): React.JSX.Element {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!api) return

    let cancelled = false

    async function load(): Promise<void> {
      const drawing = await getNoteDrawing(workspaceId, noteId, drawingId)
      if (cancelled || !api) return

      const files = Object.values(drawing.scene.files ?? {}) as unknown as BinaryFileList
      if (files.length > 0) api.addFiles(files)

      api.updateScene({
        elements: (drawing.scene.elements ?? []) as unknown as SceneElements,
        appState: (drawing.scene.appState ?? {}) as unknown as SceneAppState
      })
      setLoaded(true)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [api, workspaceId, noteId, drawingId])

  async function handleSave(): Promise<void> {
    if (!api) return
    setSaving(true)
    try {
      await saveDrawingScene(workspaceId, noteId, drawingId, {
        elements: api.getSceneElements() as unknown[],
        appState: api.getAppState() as unknown as Record<string, unknown>,
        files: api.getFiles() as unknown as Record<string, unknown>
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="text-sm font-medium text-neutral-200">{title}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!loaded || saving}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DrawingCanvas onApiReady={setApi} />
      </div>
    </div>
  )
}

export default NoteDrawingEditor
