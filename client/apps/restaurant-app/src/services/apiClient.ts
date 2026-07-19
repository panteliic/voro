export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const TOKEN_KEY = 'voro_restaurant_access_token'
export const REFRESH_TOKEN_KEY = 'voro_restaurant_refresh_token'
export const USER_KEY = 'voro_restaurant_user'

type RefreshResponse = {
  accessToken: string
  refreshToken: string
  user: unknown
}

let refreshPromise: Promise<string> | null = null

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please sign in again.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || ''

  if (!refreshToken) {
    throw new SessionExpiredError()
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/restaurant/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Partial<RefreshResponse> & { message?: string }

        if (!response.ok || !data.accessToken || !data.refreshToken) {
          throw new SessionExpiredError(data.message)
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

  await fetch(`${API_URL}/restaurant/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined)
}

export async function request<TResponse>(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const send = (accessToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    })

  let response = await send(localStorage.getItem(TOKEN_KEY) || token)

  if (response.status === 401) {
    response = await send(await refreshAccessToken())
  }

  const data = (await response.json()) as TResponse & { message?: string }

  if (!response.ok) {
    if (response.status === 401) {
      throw new SessionExpiredError(data.message)
    }

    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export async function publicRequest<TResponse>(path: string, body: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as TResponse & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}
