let cachedBaseUrl: string | null = null

async function getApiBaseUrl(): Promise<string> {
  if (!cachedBaseUrl) {
    cachedBaseUrl = await window.api.getApiBaseUrl()
  }
  return cachedBaseUrl
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = await getApiBaseUrl()
  const response = await fetch(`${baseUrl}${path}`, init)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `API error ${response.status} on ${path}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
