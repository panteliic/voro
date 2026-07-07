import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '../common/LoadingState'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth()

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-background p-4 text-content">
        <LoadingState label="Checking admin session..." />
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return <Outlet />
}
