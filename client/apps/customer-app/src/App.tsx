import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster, TooltipProvider } from '@voro/ui'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { logout, refreshSession, syncAuthTokens } from './features/auth/authSlice'
import AuthCallback from './pages/AuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import { ThemeProvider } from './theme/theme'
import { useI18n } from './i18n/i18n'
import {
  CUSTOMER_SESSION_EXPIRED_EVENT,
  CUSTOMER_SESSION_REFRESHED_EVENT,
  type CustomerSessionTokens,
} from './services/customerApi'

function RequireAuth({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const { accessToken, refreshStatus, refreshToken, user } = useAppSelector((state) => state.auth)
  const isLoggedIn = Boolean(accessToken || refreshToken)

  useEffect(() => {
    if (refreshToken && !user && refreshStatus === 'idle') {
      void dispatch(refreshSession({ refreshToken }))
    }
  }, [dispatch, refreshStatus, refreshToken, user])

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (refreshToken && !user && refreshStatus !== 'failed') {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-content">
        <p className="text-sm text-muted-foreground">{t('auth.checkingSession')}</p>
      </main>
    )
  }

  return children
}

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const handleSessionRefresh = (event: Event) => {
      const tokens = (event as CustomEvent<CustomerSessionTokens>).detail

      if (tokens?.accessToken && tokens.refreshToken) {
        dispatch(syncAuthTokens(tokens))
      }
    }
    const handleSessionExpired = () => dispatch(logout())

    window.addEventListener(CUSTOMER_SESSION_REFRESHED_EVENT, handleSessionRefresh)
    window.addEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleSessionExpired)

    return () => {
      window.removeEventListener(CUSTOMER_SESSION_REFRESHED_EVENT, handleSessionRefresh)
      window.removeEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [dispatch])

  const protectedHome = (
    <RequireAuth>
      <Home />
    </RequireAuth>
  )

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Routes>
          <Route path="/" element={protectedHome} />
          <Route path="/search" element={protectedHome} />
          <Route path="/orders" element={protectedHome} />
          <Route path="/restaurants/:restaurantId" element={protectedHome} />
          <Route path="/addresses" element={<Navigate to="/settings/delivery" replace />} />
          <Route path="/payments" element={<Navigate to="/settings/payments" replace />} />
          <Route path="/settings" element={protectedHome} />
          <Route path="/settings/:section" element={protectedHome} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
