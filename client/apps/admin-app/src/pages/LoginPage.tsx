import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Input } from '@voro/ui'
import { useAuth } from '../hooks/useAuth'
import { LanguageSwitch } from '../components/layout/LanguageSwitch'
import { useI18n } from '../i18n/i18n'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate replace to="/" />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('auth.signInError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-content">
      <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="Voro" className="size-10 shrink-0 rounded-voro-lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{t('auth.loginTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('auth.loginDesc')}</p>
          </div>
          </div>
          <LanguageSwitch />
        </div>
        <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            {t('auth.email')}
            <Input
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            {t('auth.password')}
            <Input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="rounded-voro-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </section>
    </main>
  )
}
