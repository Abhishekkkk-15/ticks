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
    throw new Error(`API error ${response.status} on ${path}`)
  }

  return response.json() as Promise<T>
}
