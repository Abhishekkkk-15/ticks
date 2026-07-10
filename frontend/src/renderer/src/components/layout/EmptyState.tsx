import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, PenTool, Command, Layers, FileText } from 'lucide-react'

interface EmptyStateProps {
  selectedWorkspaceName: string | null
  onOpenCommandPalette: () => void
  onNewNote: () => void
  onNewWorkspace: () => void
  onOpenWhiteboard: () => void
}

export function EmptyState({
  selectedWorkspaceName,
  onOpenCommandPalette,
  onNewNote,
  onNewWorkspace,
  onOpenWhiteboard
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-neutral-950/20 px-6 text-center select-none overflow-hidden">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-orange-500/5 blur-[60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="z-10 flex max-w-md flex-col items-center"
      >
        {/* Animated Icon Ring */}
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-neutral-950/50">
          <Sparkles size={28} className="text-amber-500 animate-pulse" />
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-20 blur-sm" />
        </div>

        <h2 className="mb-2 text-xl font-semibold tracking-tight text-neutral-100">
          {selectedWorkspaceName ? `Inside ${selectedWorkspaceName}` : 'Welcome to ticks'}
        </h2>
        <p className="mb-8 text-xs leading-relaxed text-neutral-400">
          {selectedWorkspaceName
            ? 'Start writing, create a whiteboard drawing, or crawler-extract details from technical learning resources.'
            : 'Select an existing learning workspace or build a new one to begin taking notes, drawing diagrams, and querying technical details.'}
        </p>

        {/* Quick Action Cards */}
        <div className="grid w-full grid-cols-2 gap-3 mb-8">
          {selectedWorkspaceName ? (
            <>
              <button
                type="button"
                onClick={onNewNote}
                className="group flex flex-col items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center transition-all hover:border-neutral-700 hover:bg-neutral-800/30"
              >
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 group-hover:bg-amber-500/20">
                  <FileText size={16} />
                </div>
                <span className="text-xs font-medium text-neutral-200">New Note</span>
              </button>

              <button
                type="button"
                onClick={onOpenWhiteboard}
                className="group flex flex-col items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center transition-all hover:border-neutral-700 hover:bg-neutral-800/30"
              >
                <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500 group-hover:bg-orange-500/20">
                  <PenTool size={16} />
                </div>
                <span className="text-xs font-medium text-neutral-200">Open Whiteboard</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onNewWorkspace}
              className="col-span-2 group flex items-center justify-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center transition-all hover:border-neutral-700 hover:bg-neutral-800/30"
            >
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 group-hover:bg-amber-500/20">
                <Layers size={16} />
              </div>
              <span className="text-xs font-medium text-neutral-200">Create New Workspace</span>
            </button>
          )}
        </div>

        {/* Command Palette Indicator */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 rounded-full border border-neutral-850 bg-neutral-900/60 px-4 py-2 text-[10px] font-medium text-neutral-400 hover:border-neutral-750 hover:bg-neutral-850 hover:text-neutral-200 transition-all shadow-md"
        >
          <Command size={11} className="text-neutral-500" />
          <span>Press</span>
          <div className="flex gap-0.5">
            <kbd className="rounded bg-neutral-800 px-1 py-0.5 border border-neutral-700 font-mono text-[9px] text-neutral-300">
              Ctrl
            </kbd>
            <kbd className="rounded bg-neutral-800 px-1 py-0.5 border border-neutral-700 font-mono text-[9px] text-neutral-300">
              Shift
            </kbd>
            <kbd className="rounded bg-neutral-800 px-1 py-0.5 border border-neutral-700 font-mono text-[9px] text-neutral-300">
              P
            </kbd>
          </div>
          <span>to view command list</span>
        </button>
      </motion.div>
    </div>
  )
}
