import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Electron's built-in PDF iframe viewer often renders blank; render with PDF.js instead.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

interface PdfPreviewProps {
  fileUrl: string
  title: string
}

function PdfPreview({ fileUrl, title }: PdfPreviewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    async function render(): Promise<void> {
      setLoading(true)
      setError(null)
      setPageCount(0)
      container.replaceChildren()

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

        setPageCount(pdf.numPages)
        const width = container.clientWidth || 640

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break
          const page = await pdf.getPage(pageNum)
          const unscaled = page.getViewport({ scale: 1 })
          const scale = Math.min(2, Math.max(1, (width - 24) / unscaled.width))
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mx-auto mb-3 block max-w-full shadow-sm'
          canvas.setAttribute('aria-label', `${title} — page ${pageNum}`)

          const context = canvas.getContext('2d')
          if (!context) throw new Error('Could not create canvas context')

          await page.render({ canvasContext: context, viewport }).promise
          if (cancelled) {
            page.cleanup()
            break
          }
          container.appendChild(canvas)
          page.cleanup()
        }

        await pdf.destroy()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render PDF')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void render()
    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [fileUrl, title])

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-neutral-900">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-neutral-950/80 text-xs text-neutral-500">
          Loading PDF…
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
