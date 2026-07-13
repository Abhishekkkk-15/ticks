/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSettings, updateSettings as updateSettingsApi } from './api'
import type { SettingsInfo, SettingsUpdate } from './types'

interface SettingsContextType {
  settings: SettingsInfo | null
  updateSettings: (update: SettingsUpdate) => Promise<void>
  loading: boolean
  error: string | null
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'ticks:settings'

function getCachedSettings(): SettingsInfo | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCachedSettings(settings: SettingsInfo): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    // Ignore
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsInfo | null>(getCachedSettings)
  const [loading, setLoading] = useState(() => !getCachedSettings())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const data = await getSettings()
        if (!cancelled) {
          setSettings(data)
          setCachedSettings(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!settings?.theme) return
    const root = document.documentElement
    root.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-warm-dark',
      'theme-forest-dark',
      'theme-ocean-blue',
      'theme-nord',
      'theme-solarized-light'
    )
    root.classList.add(`theme-${settings.theme}`)
  }, [settings?.theme])

  // Apply font & size globally via CSS custom properties so the whole
  // app (sidebar, toolbar, preview, etc.) picks up the change immediately.
  useEffect(() => {
    const root = document.documentElement
    if (settings?.editor_font) {
      root.style.setProperty('--app-font', settings.editor_font)
    }
    if (settings?.font_size) {
      root.style.setProperty('--app-font-size', `${settings.font_size}px`)
    }
  }, [settings?.editor_font, settings?.font_size])

  const updateSettings = async (update: SettingsUpdate): Promise<void> => {
    try {
      const updated = await updateSettingsApi(update)
      setSettings(updated)
      setCachedSettings(updated)
      window.api.notifySettingsUpdated()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update settings')
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading, error }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
