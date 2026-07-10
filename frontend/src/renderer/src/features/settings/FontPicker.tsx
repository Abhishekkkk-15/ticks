import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

// Popular coding/writing fonts as a fallback when queryLocalFonts isn't available
const FALLBACK_FONTS = [
  'monospace',
  'sans-serif',
  'serif',
  'JetBrains Mono',
  'Fira Code',
  'Fira Mono',
  'Cascadia Code',
  'Cascadia Mono',
  'Source Code Pro',
  'Hack',
  'Inconsolata',
  'IBM Plex Mono',
  'Roboto Mono',
  'Ubuntu Mono',
  'Courier New',
  'Consolas',
  'Monaco',
  'Menlo',
  'Anonymous Pro',
  'Noto Sans Mono',
  'Victor Mono',
  'Iosevka',
  'Geist Mono',
  'Input Mono',
  'Space Mono',
  'DM Mono',
  'PT Mono',
  'Overpass Mono',
  'Liberation Mono',
  'DejaVu Sans Mono'
]

interface FontPickerProps {
  value: string
  onChange: (font: string) => void
}

function FontPicker({ value, onChange }: FontPickerProps): React.JSX.Element {
  const [fonts, setFonts] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load system fonts
  useEffect(() => {
    async function loadFonts(): Promise<void> {
      try {
        // queryLocalFonts is available in Electron (Chromium 103+)
        // It requires the user to grant permission the first time.
        const localFonts = await (
          window as unknown as { queryLocalFonts: () => Promise<{ family: string }[]> }
        ).queryLocalFonts()
        // Deduplicate by family name and sort alphabetically
        const families = Array.from(new Set(localFonts.map((f) => f.family))).sort((a, b) =>
          a.localeCompare(b)
        )
        setFonts(families.length ? families : FALLBACK_FONTS)
      } catch {
        // Permission denied or API unavailable — use curated list
        setFonts(FALLBACK_FONTS)
      } finally {
        setLoading(false)
      }
    }
    loadFonts()
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  const filtered = query
    ? fonts.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
    : fonts

  function selectFont(font: string): void {
    onChange(font)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative max-w-md">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm transition-colors hover:border-neutral-700 focus:border-neutral-600 focus:outline-none"
      >
        <span
          className="flex-1 truncate text-left text-neutral-200"
          style={{ fontFamily: value }}
        >
          {value || 'Select a font…'}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-neutral-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-700/80 bg-neutral-900 shadow-2xl shadow-black/60">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
            <Search size={13} className="shrink-0 text-neutral-500" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-neutral-600 hover:text-neutral-400"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Font list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-neutral-500">
                Loading system fonts…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-neutral-500">No fonts found</div>
            ) : (
              filtered.map((font) => {
                const isSelected = font === value
                return (
                  <button
                    key={font}
                    type="button"
                    onClick={() => selectFont(font)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-violet-500/10 text-violet-300'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
                    }`}
                  >
                    {/* Font name rendered in that font */}
                    <span style={{ fontFamily: font }}>{font}</span>
                    {/* Small "Aa" preview in the actual font */}
                    <span
                      className="shrink-0 text-xs text-neutral-500"
                      style={{ fontFamily: font }}
                    >
                      Aa
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-neutral-800 px-3 py-1.5">
            <p className="text-[10px] text-neutral-600">
              {loading
                ? 'Detecting installed fonts…'
                : `${fonts.length} font${fonts.length !== 1 ? 's' : ''} available`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FontPicker
