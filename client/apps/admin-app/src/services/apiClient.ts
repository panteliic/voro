export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const TOKEN_KEY = 'voro_admin_access_token'
export const REFRESH_TOKEN_KEY = 'voro_admin_refresh_token'
export const USER_KEY = 'voro_admin_user'
export const ADMIN_SESSION_EXPIRED_EVENT = 'voro:admin-session-expired'

type RequestOptions = RequestInit & {
  token?: string
}

type RefreshResponse = {
  accessToken: string
  refreshToken: string
  user: unknown
}

let refreshPromise: Promise<string> | null = null

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT))
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || ''

  if (!refreshToken) {
    clearStoredSession()
    throw new Error('Session expired. Please sign in again.')
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Partial<RefreshResponse> & { message?: string }

        if (!response.ok || !data.accessToken || !data.refreshToken) {
          clearStoredSession()
          throw new Error(data.message || 'Session expired. Please sign in again.')
        }

        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
        if (data.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        }

        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export async function revokeSession() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || ''

  if (!refreshToken) {
    return
  }

  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined)
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
) {
  const token = options.token ?? getStoredToken()
  const send = (accessToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    })

  let response = await send(token)

  if (response.status === 401 && token && !path.includes('/auth/')) {
    response = await send(await refreshAccessToken())
  }

  if (response.status === 401 && !path.includes('/auth/')) {
    clearStoredSession()
  }

  const data = (await response.json().catch(() => ({}))) as TResponse & {
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}
