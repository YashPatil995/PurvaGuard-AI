// Thin client-side fetch helper used by views.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || ''

function apiUrl(path: string) {
  if (!path.startsWith('/')) return path
  return `${API_BASE_URL}${path}`
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }

  return res.json() as Promise<T>
}

export async function apiPost<T = any>(
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }

  return res.json() as Promise<T>
}

export async function apiPatch<T = any>(
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }

  return res.json() as Promise<T>
}