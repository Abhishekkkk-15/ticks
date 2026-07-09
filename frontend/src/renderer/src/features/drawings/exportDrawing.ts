import { exportToBlob, exportToSvg, serializeAsJSON } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportDrawingAsPng(api: ExcalidrawImperativeAPI): Promise<void> {
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: api.getAppState(),
    files: api.getFiles(),
    mimeType: 'image/png'
  })
  downloadBlob(blob, 'drawing.png')
}

export async function exportDrawingAsSvg(api: ExcalidrawImperativeAPI): Promise<void> {
  const svg = await exportToSvg({
    elements: api.getSceneElements(),
    appState: api.getAppState(),
    files: api.getFiles()
  })
  const svgString = new XMLSerializer().serializeToString(svg)
  downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), 'drawing.svg')
}

export function exportDrawingAsExcalidrawFile(api: ExcalidrawImperativeAPI): void {
  const json = serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), 'local')
  downloadBlob(new Blob([json], { type: 'application/json' }), 'drawing.excalidraw')
}
