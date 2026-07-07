export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const TOKEN_KEY = 'voro_admin_access_token'
export const REFRESH_TOKEN_KEY = 'voro_admin_refresh_token'
export const USER_KEY = 'voro_admin_user'

type RequestOptions = RequestInit & {
  token?: string
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
) {
  const token = options.token ?? getStoredToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = (await response.json().catch(() => ({}))) as TResponse & {
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}
