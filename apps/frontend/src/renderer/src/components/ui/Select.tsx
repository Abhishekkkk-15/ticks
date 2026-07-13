import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  size?: 'sm' | 'md'
}

const SIZE_CLASSES: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm'
}

function Select({
  value,
  onChange,
  options,
  className = '',
  size = 'sm'
}: SelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selected = options.find((option) => option.value === value)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 transition-colors hover:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 ${SIZE_CLASSES[size]}`}
      >
        <span className="truncate">{selected?.label ?? '—'}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full min-w-[10rem] overflow-auto rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-xl shadow-black/40"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                option.value === value
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-300 hover:bg-neutral-800/60'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={12} className="shrink-0 text-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Select
