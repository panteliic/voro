import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import { clearAuthFeedback, resendCode, setPendingEmail, verifyEmail } from '../features/auth/authSlice'

function VerifyEmail() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { devCode, error, message, pendingEmail, resendStatus, verifyStatus } = useAppSelector(
    (state) => state.auth,
  )
  const [email, setEmail] = useState(pendingEmail)
  const [code, setCode] = useState(devCode)
  const isVerifying = verifyStatus === 'loading'
  const isResending = resendStatus === 'loading'
  const helperText = error || message || 'Enter the six-digit code from your email.'

  useEffect(() => {
    setEmail(pendingEmail)
  }, [pendingEmail])

  useEffect(() => {
    setCode(devCode)
  }, [devCode])

  useEffect(() => {
    return () => {
      dispatch(clearAuthFeedback())
    }
  }, [dispatch])

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dispatch(setPendingEmail(email))

    const result = await dispatch(verifyEmail({ email, code }))

    if (verifyEmail.fulfilled.match(result)) {
      navigate('/login', { replace: true })
    }
  }

  async function handleResend() {
    dispatch(setPendingEmail(email))
    await dispatch(resendCode({ email }))
  }

  return (
    <AuthLayout
      title="One quick check before your first order."
      description="The code keeps your account tied to the right inbox and helps protect your orders."
      panelTitle="Code expires in 10 minutes"
      panelDescription="You can request a new one if needed."
    >
      <AuthHeader title="Verify your email" description={helperText} />

      <form className="flex flex-col gap-4" onSubmit={handleVerify}>
        <AuthField
          icon={Mail}
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="john.doe@example.com"
          type="email"
          value={email}
        />
        <AuthField
          className="tracking-[0.35em]"
          icon={ShieldCheck}
          inputMode="numeric"
          label="Verification code"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          type="text"
          value={code}
        />

        <Button className="w-full cursor-pointer gap-2" disabled={isVerifying} type="submit">
          {isVerifying ? 'Verifying...' : 'Verify email'}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <Button
        className="mt-3 w-full cursor-pointer gap-2"
        disabled={isResending || !email}
        onClick={handleResend}
        type="button"
        variant="outline"
      >
        <RefreshCw className="size-4" />
        {isResending ? 'Sending...' : 'Resend code'}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Wrong email?{' '}
        <Link className="font-medium text-action hover:underline" to="/signup">
          Create account again
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmail
