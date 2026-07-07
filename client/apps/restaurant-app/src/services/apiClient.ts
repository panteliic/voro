export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const TOKEN_KEY = 'voro_restaurant_access_token'
export const USER_KEY = 'voro_restaurant_user'

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please sign in again.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export async function request<TResponse>(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
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
