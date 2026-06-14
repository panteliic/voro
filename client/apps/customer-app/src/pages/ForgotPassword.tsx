import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import {
  clearAuthFeedback,
  requestPasswordReset,
  resetPassword,
  setPendingEmail,
  verifyPasswordResetCode,
} from '../features/auth/authSlice'

function ForgotPassword() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const {
    devCode,
    error,
    message,
    pendingEmail,
    requestPasswordResetStatus,
    resetPasswordStatus,
    verifyPasswordResetCodeStatus,
  } = useAppSelector((state) => state.auth)
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
  const [email, setEmail] = useState(pendingEmail)
  const [code, setCode] = useState(devCode)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const isSending = requestPasswordResetStatus === 'loading'
  const isVerifying = verifyPasswordResetCodeStatus === 'loading'
  const isResetting = resetPasswordStatus === 'loading'

  useEffect(() => {
    dispatch(clearAuthFeedback())
  }, [dispatch])

  useEffect(() => {
    setCode(devCode)
  }, [devCode])

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')
    dispatch(setPendingEmail(email))

    const result = await dispatch(requestPasswordReset({ email }))

    if (requestPasswordReset.fulfilled.match(result)) {
      setStep('code')
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')

    if (!email || !code) {
      setLocalError('Enter the code sent to your email.')
      return
    }

    const result = await dispatch(verifyPasswordResetCode({ email, code }))

    if (verifyPasswordResetCode.fulfilled.match(result)) {
      setResetToken(result.payload.resetToken)
      setStep('password')
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    if (!resetToken) {
      setLocalError('Verify the code before setting a new password.')
      setStep('code')
      return
    }

    const result = await dispatch(resetPassword({ resetToken, password }))

    if (resetPassword.fulfilled.match(result)) {
      navigate('/login', { replace: true })
    }
  }

  return (
    <AuthLayout
      title="Reset your password without leaving the flow."
      description="We send a short code to your email, then you choose a new password."
      panelTitle="Password recovery"
      panelDescription="Codes expire after 10 minutes."
    >
      <AuthHeader
        title="Forgot password"
        description={error || message || 'Enter your email to receive a reset code.'}
      />

      {step === 'email' ? (
        <form className="flex flex-col gap-4" onSubmit={handleRequestCode}>
          <AuthField
            icon={Mail}
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="john.doe@example.com"
            type="email"
            value={email}
          />

          <Button className="w-full cursor-pointer gap-2" disabled={isSending} type="submit">
            {isSending ? 'Sending code...' : 'Send reset code'}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      ) : step === 'code' ? (
        <form className="flex flex-col gap-4" onSubmit={handleVerifyCode}>
          <div className="rounded-voro-lg border border-line bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Code sent to <span className="font-medium text-content">{email}</span>
          </div>
          <AuthField
            className="tracking-[0.35em]"
            icon={ShieldCheck}
            inputMode="numeric"
            label="Reset code"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            type="text"
            value={code}
          />

          {localError ? <p className="text-sm font-medium text-destructive">{localError}</p> : null}

          <Button className="w-full cursor-pointer gap-2" disabled={isVerifying} type="submit">
            {isVerifying ? 'Verifying...' : 'Verify code'}
            <ArrowRight className="size-4" />
          </Button>

          <Button
            className="w-full cursor-pointer"
            onClick={() => setStep('email')}
            type="button"
            variant="outline"
          >
            Use another email
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
          <div className="rounded-voro-lg border border-line bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Verified for <span className="font-medium text-content">{email}</span>
          </div>
          <AuthField
            icon={KeyRound}
            label="New password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            type="password"
            value={password}
          />
          <AuthField
            icon={KeyRound}
            label="Confirm password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat new password"
            type="password"
            value={confirmPassword}
          />

          {localError ? <p className="text-sm font-medium text-destructive">{localError}</p> : null}

          <Button className="w-full cursor-pointer gap-2" disabled={isResetting} type="submit">
            {isResetting ? 'Updating password...' : 'Update password'}
            <ArrowRight className="size-4" />
          </Button>

          <Button
            className="w-full cursor-pointer"
            onClick={() => {
              setResetToken('')
              setStep('code')
            }}
            type="button"
            variant="outline"
          >
            Back to code
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link className="font-medium text-action hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ForgotPassword
