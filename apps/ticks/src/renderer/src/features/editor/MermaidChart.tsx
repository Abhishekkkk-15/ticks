import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { useSettings } from '../settings/SettingsContext'
import { isLightTheme } from '../settings/themeUtils'

interface MermaidChartProps {
  chart: string
}

function MermaidChart({ chart }: MermaidChartProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()
  const isLight = isLightTheme(settings?.theme)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isLight ? 'default' : 'dark'
    })
  }, [isLight])

  useEffect(() => {
    if (ref.current) {
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
      mermaid.render(id, chart)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
          }
        })
        .catch((e) => {
          if (ref.current) {
            ref.current.innerText = e.message
          }
        })
    }
  }, [chart, isLight])

  return <div ref={ref} className="mermaid flex justify-center py-4 text-sm" />
}

export default MermaidChart
