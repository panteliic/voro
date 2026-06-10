import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, KeyRound, Mail } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthDivider } from '../components/auth/AuthDivider'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import { SocialButtons } from '../components/auth/SocialButtons'
import { clearAuthFeedback, loginUser } from '../features/auth/authSlice'

function Login() {
  const dispatch = useAppDispatch()
  const { error, loginStatus, message } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const isLoading = loginStatus === 'loading'

  useEffect(() => {
    dispatch(clearAuthFeedback())
  }, [dispatch])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void dispatch(loginUser({ email, password }))
  }

  return (
    <AuthLayout
      title="Fast food delivery, without the noise."
      description="Manage orders, customers, and routes from one clean Voro workspace."
      panelTitle="Voro Customer"
      panelDescription="Sign in to continue."
    >
      <AuthHeader title="Welcome back" description="Enter your details to sign in." />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthField
          icon={Mail}
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="john.doe@example.com"
          type="email"
          value={email}
        />
        <AuthField
          icon={KeyRound}
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input className="size-4 accent-[var(--btn-primary-bg)]" type="checkbox" />
            Remember me
          </label>
          <Link className="font-medium text-action hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {error || message ? (
          <p className={`text-sm font-medium ${error ? 'text-destructive' : 'text-action'}`}>
            {error || message}
          </p>
        ) : null}

        <Button className="w-full cursor-pointer gap-2" disabled={isLoading} type="submit">
          {isLoading ? 'Signing in...' : 'Sign In'}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <AuthDivider />
      <SocialButtons />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link className="font-medium text-action hover:underline" to="/signup">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Login
