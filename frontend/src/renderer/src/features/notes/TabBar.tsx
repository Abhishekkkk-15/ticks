import { useState } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Note } from './types'

export interface OpenTab {
  workspaceId: string
  note: Note
}

interface TabBarProps {
  tabs: OpenTab[]
  activeId: string | null
  activeDirty: boolean
  onSelect: (noteId: string) => void
  onClose: (noteId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

function TabBar({
  tabs,
  activeId,
  activeDirty,
  onSelect,
  onClose,
  onReorder
}: TabBarProps): React.JSX.Element | null {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  if (tabs.length === 0) return null

  return (
    <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-neutral-800 bg-neutral-950">
      {tabs.map((tab, index) => {
        const isActive = tab.note.id === activeId
        return (
          <div
            key={tab.note.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index)
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
            onClick={() => onSelect(tab.note.id)}
            onAuxClick={(event) => {
              if (event.button === 1) onClose(tab.note.id)
            }}
            role="tab"
            aria-selected={isActive}
            className={`group relative flex max-w-[180px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-neutral-800 px-3 py-2 text-xs ${
              isActive
                ? 'bg-neutral-900 text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-900/60 hover:text-neutral-300'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {isActive && activeDirty && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400 z-10" />
            )}
            <span className="min-w-0 flex-1 truncate z-10">{tab.note.title}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onClose(tab.note.id)
              }}
              aria-label={`Close ${tab.note.title}`}
              className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-200 z-10"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default TabBar
