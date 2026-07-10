export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text

  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-amber-500/30 text-amber-200">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}
