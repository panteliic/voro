import { useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { LogOut } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout, logoutUser } from '../features/auth/authSlice'

function Home() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { logoutStatus, refreshToken, user } = useAppSelector((state) => state.auth)
  const name = user?.name || 'korisnice'
  const isLoggingOut = logoutStatus === 'loading'

  async function handleLogout() {
    if (refreshToken) {
      await dispatch(logoutUser({ refreshToken }))
    } else {
      dispatch(logout())
    }

    navigate('/login', { replace: true })
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-content">
      <div>
        <h1 className="text-3xl font-bold">Ulogovan si, {name}!</h1>

        <p className="mt-3 text-muted-foreground">Ovo je samo test stranica posle login-a.</p>
        <Button
          className="mt-6 cursor-pointer gap-2"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
        >
          <LogOut className="size-4" />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </main>
  )
}

export default Home
