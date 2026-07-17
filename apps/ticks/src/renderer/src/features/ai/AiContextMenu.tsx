import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlignLeft, BookOpen, CheckSquare, Sparkles, WandSparkles, Zap, Highlighter } from 'lucide-react'

export interface AiContextMenuPosition {
  x: number
  y: number
}

export interface AiContextMenuProps {
  position: AiContextMenuPosition | null
  selectedText: string
  hideAi?: boolean
  onAction: (action: string, text: string) => void
  onClose: () => void
}

const QUICK_ACTIONS = [
  { id: 'explain', label: 'Explain simply', icon: BookOpen },
  { id: 'summarize', label: 'Summarize', icon: AlignLeft },
  { id: 'expand', label: 'Expand', icon: Zap },
  { id: 'format', label: 'Format with AI', icon: WandSparkles },
  { id: 'checklist', label: 'To checklist', icon: CheckSquare },
  { id: 'highlight', label: 'Highlight text', icon: Highlighter },
  { id: 'highlight-sketch', label: 'Sketch highlight', icon: Highlighter },
  { id: 'highlight-error', label: 'Error highlight', icon: Highlighter }
]

function AiContextMenu({
  position,
  selectedText,
  hideAi,
  onAction,
  onClose
}: AiContextMenuProps): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!position) return
    function handlePointerDown(e: PointerEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use capture so we see it before the editor's own handler
    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [position, onClose])

  // Also close on Escape
  useEffect(() => {
    if (!position) return
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [position, onClose])

  return (
    <AnimatePresence>
      {position && selectedText.trim() && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999
          }}
          className="min-w-[200px] overflow-hidden rounded-xl border border-neutral-700/80 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
            {!hideAi && <Sparkles size={12} className="text-violet-400" />}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              {hideAi ? 'Actions' : 'AI Actions'}
            </span>
          </div>

          {/* Actions */}
          <div className="p-1">
            {QUICK_ACTIONS.filter((a) => !hideAi || a.id.startsWith('highlight')).map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:bg-violet-500/10 hover:text-violet-300"
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent editor blur / deselect
                    e.stopPropagation()
                    onAction(action.id, selectedText)
                    onClose()
                  }}
                >
                  <Icon size={14} className="shrink-0 text-neutral-500" />
                  <span>{action.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AiContextMenu
