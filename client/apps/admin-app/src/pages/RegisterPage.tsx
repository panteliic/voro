import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button, Input } from '@voro/ui'
import { LanguageSwitch } from '../components/layout/LanguageSwitch'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n/i18n'

export function RegisterPage() {
  const { isAuthenticated, registerFirstAdmin } = useAuth()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate replace to="/" />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')
    setIsSubmitting(true)

    try {
      await registerFirstAdmin({ name, email, password })
      setName('')
      setEmail('')
      setPassword('')
      setStatus(t('auth.created'))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('auth.createError'))
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
            <h1 className="text-xl font-bold">{t('auth.registerTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('auth.registerDesc')}</p>
          </div>
          </div>
          <LanguageSwitch />
        </div>
        <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            {t('auth.name')}
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            {t('auth.email')}
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            {t('auth.password')}
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {status ? <p className="rounded-voro-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{status}</p> : null}
          {error ? <p className="rounded-voro-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? t('auth.creating') : t('auth.createAdmin')}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('auth.alreadyAdmin')}{' '}
          <Link className="font-bold text-action" to="/login">
            {t('auth.signIn')}
          </Link>
        </p>
      </section>
    </main>
  )
}
