import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster, TooltipProvider } from '@voro/ui'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { refreshSession } from './features/auth/authSlice'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'

function RequireAuth({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
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
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </main>
    )
  }

  return children
}

function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
