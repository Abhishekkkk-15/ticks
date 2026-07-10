import { apiFetch } from '../../lib/api'
import type { SettingsInfo } from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function getSettings(): Promise<SettingsInfo> {
  return apiFetch<SettingsInfo>('/settings')
}

export function setMistralApiKey(apiKey: string): Promise<void> {
  return apiFetch<void>('/settings/mistral-api-key', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ api_key: apiKey })
  })
}

export function setStyleExamples(examples: string[]): Promise<string[]> {
  return apiFetch<string[]>('/settings/style-examples', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ examples })
  })
}
