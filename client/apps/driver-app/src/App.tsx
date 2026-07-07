import { useEffect, useState } from 'react'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { loginDriver, setupDriverPassword } from './services/authApi'
import { getDriverDashboard } from './services/driverApi'
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
      setStatus(error instanceof Error ? error.message : 'Could not load driver profile.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard(token)
  }, [])

  async function handleLogin(payload: LoginPayload) {
    setIsLoading(true)
    setStatus('')

    try {
      const data = await loginDriver(payload)

      storeSession(data.accessToken, data.user)
      setToken(data.accessToken)
      setUser(data.user)
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

  function handleLogout() {
    clearSession()
    setToken('')
    setUser(null)
    setDashboard(null)
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
      onLogout={handleLogout}
      onRefresh={() => void loadDashboard()}
      status={status}
      user={user}
    />
  )
}

export default App
