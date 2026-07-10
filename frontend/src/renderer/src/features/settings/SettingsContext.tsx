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

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const data = await getSettings()
        if (!cancelled) {
          setSettings(data)
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
    root.classList.remove('theme-light', 'theme-dark', 'theme-warm-dark')
    root.classList.add(`theme-${settings.theme}`)
  }, [settings?.theme])

  const updateSettings = async (update: SettingsUpdate): Promise<void> => {
    try {
      const updated = await updateSettingsApi(update)
      setSettings(updated)
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
