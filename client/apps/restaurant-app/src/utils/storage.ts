import type { AuthUser } from '../types/auth'
import { TOKEN_KEY, USER_KEY } from '../services/apiClient'

export function storedToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function storedUser() {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? (JSON.parse(value) as AuthUser) : null
  } catch {
    return null
  }
}

export function storeSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
