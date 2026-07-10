import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import MiniEditorApp from './features/mini-tray/MiniEditorApp'

import { SettingsProvider } from './features/settings/SettingsContext'

const isMini = new URLSearchParams(window.location.search).get('mode') === 'mini'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>{isMini ? <MiniEditorApp /> : <App />}</SettingsProvider>
  </StrictMode>
)
