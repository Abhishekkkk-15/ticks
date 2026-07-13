import { useEffect, useState } from 'react'

export function useIsMaximized(): boolean {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (window.api.platform === 'darwin') return
    window.api.windowControls.isMaximized().then(setIsMaximized)
    return window.api.windowControls.onMaximizedChange(setIsMaximized)
  }, [])

  return isMaximized
}
