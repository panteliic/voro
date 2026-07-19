import { useEffect, useState } from 'react'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { loginDriver, setupDriverPassword } from './services/authApi'
import { getDriverDashboard, updateDriverPresence } from './services/driverApi'
import { revokeSession, SessionExpiredError } from './services/apiClient'
import type { AuthUser, LoginPayload, SetupPasswordPayload } from './types/auth'
import type { DashboardResponse } from './types/driver'
import { clearSession, storedToken, storedUser, storeSession } from './utils/storage'

function App() {
  const [token, setToken] = useState(storedToken)
  const [user, setUser] = useState<AuthUser | null>(storedUser)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  async function loadDashboard(nextToken = token) {
    if (!nextToken) {
      return
    }

    setIsLoading(true)
    setStatus('')

    try {
      setDashboard(await getDriverDashboard(nextToken))
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        clearSession()
        setToken('')
        setUser(null)
        setDashboard(null)
        setStatus(error.message)
        return
      }

      setStatus(error instanceof Error ? error.message : 'Could not load driver profile.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      return
    }

    void updateDriverPresence(token, { isOnline: true })
      .catch(() => undefined)
      .finally(() => void loadDashboard(token))
  }, [])

  async function handleLogin(payload: LoginPayload) {
    setIsLoading(true)
    setStatus('')

    try {
      const data = await loginDriver(payload)

      storeSession(data.accessToken, data.refreshToken, data.user)
      setToken(data.accessToken)
      setUser(data.user)
      await updateDriverPresence(data.accessToken, { isOnline: true })
      await loadDashboard(data.accessToken)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetupPassword(payload: SetupPasswordPayload) {
    setIsSettingPassword(true)
    setStatus('')

    try {
      await setupDriverPassword(payload)
      setStatus('Password created. Sign in with the new password.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not set password.')
    } finally {
      setIsSettingPassword(false)
    }
  }

  async function handleLogout() {
    try {
      if (token) {
        await updateDriverPresence(token, { isOnline: false })
      }
      await revokeSession()
    } finally {
      clearSession()
      setToken('')
      setUser(null)
      setDashboard(null)
    }
  }

  if (!token || !user) {
    return (
      <AuthPage
        isLoading={isLoading}
        isSettingPassword={isSettingPassword}
        onClearStatus={() => setStatus('')}
        onLogin={handleLogin}
        onSetupPassword={handleSetupPassword}
        status={status}
      />
    )
  }

  return (
    <DashboardPage
      dashboard={dashboard}
      isLoading={isLoading}
      onLogout={() => void handleLogout()}
      onRefresh={() => void loadDashboard()}
      status={status}
      user={user}
    />
  )
}

export default App
