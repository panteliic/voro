import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthDivider } from '../components/auth/AuthDivider'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import { googleAuthEnabled, SocialButtons } from '../components/auth/SocialButtons'
import { clearAuthFeedback, signupUser } from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'

function SignUp() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useI18n()
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
      setLocalError(t('auth.signup.passwordMismatch'))
      return
    }

    const result = await dispatch(signupUser({ name, email, password }))

    if (signupUser.fulfilled.match(result)) {
      navigate('/verify-email')
    }
  }

  return (
    <AuthLayout
      title={t('auth.signup.heroTitle')}
      description={t('auth.signup.heroDesc')}
      panelTitle={t('auth.signup.panelTitle')}
      panelDescription={t('auth.signup.panelDesc')}
    >
      <AuthHeader
        title={t('auth.signup.title')}
        description={t('auth.signup.desc')}
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthField
          icon={UserRound}
          label={t('auth.signup.fullName')}
          onChange={(event) => setName(event.target.value)}
          placeholder="John Doe"
          type="text"
          value={name}
        />
        <AuthField
          icon={Mail}
          label={t('common.email')}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="john.doe@example.com"
          type="email"
          value={email}
        />
        <AuthField
          icon={KeyRound}
          label={t('common.password')}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.signup.passwordPlaceholder')}
          type="password"
          value={password}
        />
        <AuthField
          icon={ShieldCheck}
          label={t('auth.signup.confirmPassword')}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={t('auth.signup.confirmPlaceholder')}
          type="password"
          value={confirmPassword}
        />

        {localError || error ? (
          <p className="text-sm font-medium text-destructive">{localError || error}</p>
        ) : null}

        <Button className="w-full cursor-pointer gap-2" disabled={isLoading} type="submit">
          {isLoading ? t('auth.signup.submitting') : t('auth.signup.submit')}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      {googleAuthEnabled ? (
        <>
          <AuthDivider />
          <SocialButtons action="signup" />
        </>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.signup.hasAccount')}{' '}
        <Link className="font-medium text-action hover:underline" to="/login">
          {t('auth.signup.signin')}
        </Link>
      </p>
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
        By creating an account you agree to the <Link className="text-action hover:underline" to="/legal/terms">Terms</Link> and acknowledge the <Link className="text-action hover:underline" to="/legal/privacy">Privacy notice</Link>.
      </p>
    </AuthLayout>
  )
}

export default SignUp
