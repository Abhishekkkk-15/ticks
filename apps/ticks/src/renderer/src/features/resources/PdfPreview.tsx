import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Electron's built-in PDF iframe viewer often renders blank; render with PDF.js instead.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

interface PdfPreviewProps {
  fileUrl: string
  title: string
  /** Multiplier on top of fit-to-width scale. Default 1. */
  zoom?: number
}

function PdfPreview({ fileUrl, title, zoom = 1 }: PdfPreviewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  // Load document once per URL
  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      setPageCount(0)
      if (pdfRef.current) {
        await pdfRef.current.destroy().catch(() => undefined)
        pdfRef.current = null
      }

      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error(`Failed to load PDF (${response.status})`)
        const data = new Uint8Array(await response.arrayBuffer())
        if (cancelled) return

        const pdf = await pdfjs.getDocument({ data }).promise
        if (cancelled) {
          await pdf.destroy()
          return
        }
        pdfRef.current = pdf
        setPageCount(pdf.numPages)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      const pdf = pdfRef.current
      pdfRef.current = null
      void pdf?.destroy().catch(() => undefined)
    }
  }, [fileUrl])

  // Re-render pages when zoom changes (or after load)
  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    const pdf = pdfRef.current
    if (!container || !pdf || loading || error) return

    const mount = container
    const pdfDoc = pdf

    async function renderPages(): Promise<void> {
      setRendering(true)
      mount.replaceChildren()

      try {
        const width = mount.clientWidth || 640
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) break
          const page = await pdfDoc.getPage(pageNum)
          const unscaled = page.getViewport({ scale: 1 })
          const fitScale = Math.max(0.5, (width - 24) / unscaled.width)
          const scale = fitScale * zoom
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mx-auto mb-3 block shadow-sm'
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.setAttribute('aria-label', `${title} — page ${pageNum}`)

          const context = canvas.getContext('2d')
          if (!context) throw new Error('Could not create canvas context')

          await page.render({ canvasContext: context, viewport }).promise
          if (cancelled) {
            page.cleanup()
            break
          }
          mount.appendChild(canvas)
          page.cleanup()
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render PDF')
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void renderPages()
    return () => {
      cancelled = true
    }
  }, [fileUrl, title, zoom, loading, error, pageCount])

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-neutral-900">
      {(loading || rendering) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-neutral-950/80 text-xs text-neutral-500">
          {loading ? 'Loading PDF…' : 'Updating zoom…'}
        </div>
      )}
      {error ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-xs text-red-400">
          {error}
        </div>
      ) : (
        <>
          {pageCount > 0 && (
            <div className="shrink-0 border-b border-neutral-800 px-3 py-1 text-[10px] text-neutral-500">
              {pageCount} page{pageCount === 1 ? '' : 's'}
            </div>
          )}
          <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-3" />
        </>
      )}
    </div>
  )
}

export default PdfPreview
