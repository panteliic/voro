import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser, LoginPayload, RegisterPayload } from '../types/auth'
import { getAdminMe, loginAdmin, registerFirstAdmin } from '../services/authApi'
import { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from '../services/apiClient'

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isCheckingSession: boolean
  login: (payload: LoginPayload) => Promise<void>
  registerFirstAdmin: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser() {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? (JSON.parse(value) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      if (!localStorage.getItem(TOKEN_KEY)) {
        setIsCheckingSession(false)
        return
      }

      try {
        const result = await getAdminMe()

        if (isMounted) {
          const nextUser = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          }
          localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
          setUser(nextUser)
        }
      } catch {
        if (isMounted) {
          logout()
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false)
        }
      }
    }

    void loadSession()

    return () => {
      isMounted = false
    }
  }, [logout])

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await loginAdmin(payload)

    localStorage.setItem(TOKEN_KEY, result.accessToken)
    if (result.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
    }
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    setUser(result.user)
  }, [])

  const handleRegisterFirstAdmin = useCallback(async (payload: RegisterPayload) => {
    await registerFirstAdmin(payload)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isCheckingSession,
      login,
      registerFirstAdmin: handleRegisterFirstAdmin,
      logout,
    }),
    [handleRegisterFirstAdmin, isCheckingSession, login, logout, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return value
}
