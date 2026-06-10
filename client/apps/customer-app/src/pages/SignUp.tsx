import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import { clearAuthFeedback, signupUser } from '../features/auth/authSlice'

function SignUp() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { signupStatus, error } = useAppSelector((state) => state.auth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const isLoading = signupStatus === 'loading'

  useEffect(() => {
    dispatch(clearAuthFeedback())
  }, [dispatch])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    const result = await dispatch(signupUser({ name, email, password }))

    if (signupUser.fulfilled.match(result)) {
      navigate('/verify-email')
    }
  }

  return (
    <AuthLayout
      title="Start ordering with a cleaner delivery flow."
      description="Create your Voro account, verify your email, and keep every order in one simple place."
      panelTitle="Email verification"
      panelDescription="A six-digit code protects every new account."
    >
      <AuthHeader
        title="Create account"
        description="We will send a verification code to your email."
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthField
          icon={UserRound}
          label="Full name"
          onChange={(event) => setName(event.target.value)}
          placeholder="John Doe"
          type="text"
          value={name}
        />
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
          placeholder="At least 8 characters"
          type="password"
          value={password}
        />
        <AuthField
          icon={ShieldCheck}
          label="Confirm password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          type="password"
          value={confirmPassword}
        />

        {localError || error ? (
          <p className="text-sm font-medium text-destructive">{localError || error}</p>
        ) : null}

        <Button className="w-full cursor-pointer gap-2" disabled={isLoading} type="submit">
          {isLoading ? 'Sending code...' : 'Create account'}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link className="font-medium text-action hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default SignUp
