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
import { useI18n } from '../i18n/i18n'

function ForgotPassword() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useI18n()
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
      setLocalError(t('auth.forgot.enterCode'))
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
      setLocalError(t('auth.signup.passwordMismatch'))
      return
    }

    if (!resetToken) {
      setLocalError(t('auth.forgot.verifyFirst'))
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
      title={t('auth.forgot.heroTitle')}
      description={t('auth.forgot.heroDesc')}
      panelTitle={t('auth.forgot.panelTitle')}
      panelDescription={t('auth.forgot.panelDesc')}
    >
      <AuthHeader
        title={t('auth.forgot.title')}
        description={error || message || t('auth.forgot.desc')}
      />

      {step === 'email' ? (
        <form className="flex flex-col gap-4" onSubmit={handleRequestCode}>
          <AuthField
            icon={Mail}
            label={t('common.email')}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="john.doe@example.com"
            type="email"
            value={email}
          />

          <Button className="w-full cursor-pointer gap-2" disabled={isSending} type="submit">
            {isSending ? t('auth.forgot.sendingCode') : t('auth.forgot.sendCode')}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      ) : step === 'code' ? (
        <form className="flex flex-col gap-4" onSubmit={handleVerifyCode}>
          <div className="rounded-voro-lg border border-line bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t('auth.forgot.codeSentTo')} <span className="font-medium text-content">{email}</span>
          </div>
          <AuthField
            className="tracking-[0.35em]"
            icon={ShieldCheck}
            inputMode="numeric"
            label={t('auth.forgot.resetCode')}
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            type="text"
            value={code}
          />

          {localError ? <p className="text-sm font-medium text-destructive">{localError}</p> : null}

          <Button className="w-full cursor-pointer gap-2" disabled={isVerifying} type="submit">
            {isVerifying ? t('auth.forgot.verifying') : t('auth.forgot.verifyCode')}
            <ArrowRight className="size-4" />
          </Button>

          <Button
            className="w-full cursor-pointer"
            onClick={() => setStep('email')}
            type="button"
            variant="outline"
          >
            {t('auth.forgot.useAnotherEmail')}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
          <div className="rounded-voro-lg border border-line bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t('auth.forgot.verifiedFor')} <span className="font-medium text-content">{email}</span>
          </div>
          <AuthField
            icon={KeyRound}
            label={t('auth.forgot.newPassword')}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('auth.signup.passwordPlaceholder')}
            type="password"
            value={password}
          />
          <AuthField
            icon={KeyRound}
            label={t('auth.forgot.confirmPassword')}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t('auth.forgot.repeatNewPassword')}
            type="password"
            value={confirmPassword}
          />

          {localError ? <p className="text-sm font-medium text-destructive">{localError}</p> : null}

          <Button className="w-full cursor-pointer gap-2" disabled={isResetting} type="submit">
            {isResetting ? t('auth.forgot.updatingPassword') : t('auth.forgot.updatePassword')}
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
            {t('auth.forgot.backToCode')}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.forgot.remembered')}{' '}
        <Link className="font-medium text-action hover:underline" to="/login">
          {t('auth.signup.signin')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ForgotPassword
