import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, Mail, RefreshCw } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthOtpInput } from '../components/auth/AuthOtpInput'
import {
  clearAuthFeedback,
  resendCode,
  setPendingEmail,
  verifyEmail,
} from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'

function VerifyEmail() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { devCode, error, message, pendingEmail, resendStatus, verifyStatus } = useAppSelector(
    (state) => state.auth,
  )
  const [email, setEmail] = useState(pendingEmail)
  const [code, setCode] = useState(devCode)
  const isVerifying = verifyStatus === 'loading'
  const isResending = resendStatus === 'loading'
  const helperText = error || message || t('auth.verify.helper')

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
      title={t('auth.verify.heroTitle')}
      description={t('auth.verify.heroDesc')}
      panelTitle={t('auth.verify.panelTitle')}
      panelDescription={t('auth.verify.panelDesc')}
    >
      <AuthHeader title={t('auth.verify.title')} description={helperText} />

      <form className="flex flex-col gap-4" onSubmit={handleVerify}>
        <AuthField
          icon={Mail}
          label={t('common.email')}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="john.doe@example.com"
          type="email"
          value={email}
        />
        <label className="grid gap-2 text-sm font-medium text-content">
          {t('auth.verify.code')}
          <AuthOtpInput disabled={isVerifying} onChange={setCode} value={code} />
        </label>

        <Button className="w-full cursor-pointer gap-2" disabled={isVerifying} type="submit">
          {isVerifying ? t('auth.verify.submitting') : t('auth.verify.submit')}
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
        {isResending ? t('auth.verify.resending') : t('auth.verify.resend')}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.verify.wrongEmail')}{' '}
        <Link className="font-medium text-action hover:underline" to="/signup">
          {t('auth.verify.createAgain')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmail
