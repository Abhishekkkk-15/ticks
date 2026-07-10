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

export async function streamText(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const baseUrl = await getApiBaseUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.detail ?? `API error ${response.status} on ${path}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}
