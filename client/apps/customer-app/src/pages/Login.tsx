import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { ArrowRight, KeyRound, Mail } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { AuthDivider } from '../components/auth/AuthDivider'
import { AuthField } from '../components/auth/AuthField'
import { AuthHeader } from '../components/auth/AuthHeader'
import { AuthLayout } from '../components/auth/AuthLayout'
import { googleAuthEnabled, SocialButtons } from '../components/auth/SocialButtons'
import { clearAuthFeedback, loginUser } from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'

function Login() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { error, loginStatus, message } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const isLoading = loginStatus === 'loading'

  useEffect(() => {
    dispatch(clearAuthFeedback())
  }, [dispatch])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await dispatch(loginUser({ email, password }))

    if (loginUser.fulfilled.match(result)) {
      navigate('/', { replace: true })
    }
  }

  return (
    <AuthLayout
      title={t('auth.hero.loginTitle')}
      description={t('auth.hero.loginDesc')}
      panelTitle={t('auth.hero.customer')}
      panelDescription={t('auth.hero.signInContinue')}
    >
      <AuthHeader title={t('auth.login.welcome')} description={t('auth.login.desc')} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
          placeholder={t('auth.login.passwordPlaceholder')}
          type="password"
          value={password}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input className="size-4 accent-[var(--btn-primary-bg)]" type="checkbox" />
            {t('auth.login.remember')}
          </label>
          <Link className="font-medium text-action hover:underline" to="/forgot-password">
            {t('auth.login.forgot')}
          </Link>
        </div>

        {error || message ? (
          <p className={`text-sm font-medium ${error ? 'text-destructive' : 'text-action'}`}>
            {error || message}
          </p>
        ) : null}

        <Button className="w-full cursor-pointer gap-2" disabled={isLoading} type="submit">
          {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      {googleAuthEnabled ? (
        <>
          <AuthDivider />
          <SocialButtons />
        </>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.login.noAccount')}{' '}
        <Link className="font-medium text-action hover:underline" to="/signup">
          {t('auth.login.signup')}
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link className="text-action hover:underline" to="/legal/privacy">Privacy</Link>{' · '}
        <Link className="text-action hover:underline" to="/legal/refunds">Cancellations & refunds</Link>
      </p>
    </AuthLayout>
  )
}

export default Login
