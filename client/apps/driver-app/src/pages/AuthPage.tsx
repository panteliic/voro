import { FormEvent, useEffect, useState } from 'react'
import { Button, Input } from '@voro/ui'
import { PublicHeader } from '../components/layout/PublicHeader'
import type { AuthMode, LoginPayload, SetupPasswordPayload, SetupPurpose } from '../types/auth'
import { emptySetup } from '../utils/forms'
import { translate, type DriverLanguage } from '../i18n'

type AuthPageProps = {
  status: string
  isLoading: boolean
  isSettingPassword: boolean
  onLogin: (payload: LoginPayload) => Promise<void>
  onSetupPassword: (payload: SetupPasswordPayload) => Promise<void>
  onClearStatus: () => void
}

export function AuthPage({
  status,
  isLoading,
  isSettingPassword,
  onClearStatus,
  onLogin,
  onSetupPassword,
}: AuthPageProps) {
  const language: DriverLanguage = localStorage.getItem('voro-driver-language') === 'en' ? 'en' : 'sr'
  const t = (key: string) => translate(language, key)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [setupPurpose, setSetupPurpose] = useState<SetupPurpose>('firstAccess')
  const [setupForm, setSetupForm] = useState(emptySetup)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invitedEmail = params.get('email')?.trim()

    if (params.get('access') !== '1' || !invitedEmail) return

    setSetupPurpose('firstAccess')
    setSetupForm((current) => ({ ...current, email: invitedEmail }))
    setAuthMode('setup')
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const setupCopy = setupPurpose === 'firstAccess'
    ? { title: t('auth.firstAccessTitle'), description: t('auth.firstAccessDesc'), button: t('auth.createPassword') }
    : { title: t('auth.resetTitle'), description: t('auth.resetDesc'), button: t('auth.setPassword') }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onLogin({ email, password })
  }

  async function handleSetupPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSetupPassword(setupForm)
    setEmail(setupForm.email)
    setPassword('')
    setSetupForm(emptySetup)
    setAuthMode('login')
  }

  function openSetup(nextPurpose: SetupPurpose) {
    setSetupPurpose(nextPurpose)
    setAuthMode('setup')
    onClearStatus()
  }

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] bg-background text-content">
      <PublicHeader />
      <div className="grid place-items-center px-4 py-8">
        {authMode === 'login' ? (
          <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-5 shadow-xl shadow-black/5">
            <h1 className="text-xl font-bold">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('auth.description')}
            </p>
            <form className="mt-5 grid gap-3" onSubmit={handleLogin}>
              <Input
                placeholder={t('auth.email')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                placeholder={t('auth.password')}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {status ? <p className="text-sm font-medium text-destructive">{status}</p> : null}
              <Button disabled={isLoading} type="submit" variant="outline">
                {isLoading ? t('auth.opening') : t('auth.open')}
              </Button>
            </form>
            <div className="mt-5 grid gap-2 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {t('auth.setupAccess')}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => openSetup('firstAccess')} type="button" variant="outline">
                  {t('auth.firstAccess')}
                </Button>
                <Button onClick={() => openSetup('passwordReset')} type="button" variant="outline">
                  {t('auth.resetPassword')}
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-5 shadow-xl shadow-black/5">
            <h1 className="text-xl font-bold">{setupCopy.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{setupCopy.description}</p>
            <form className="mt-5 grid gap-3" onSubmit={handleSetupPassword}>
              <Input
                placeholder={t('auth.email')}
                value={setupForm.email}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <Input
                placeholder={t('auth.setupCode')}
                value={setupForm.setupCode}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, setupCode: event.target.value }))
                }
              />
              <Input
                placeholder={setupPurpose === 'firstAccess' ? t('auth.createDriverPassword') : t('auth.createNewPassword')}
                type="password"
                value={setupForm.password}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, password: event.target.value }))
                }
              />
              {status ? <p className="text-sm font-medium text-destructive">{status}</p> : null}
              <Button disabled={isSettingPassword} type="submit">
                {isSettingPassword ? t('auth.savingPassword') : setupCopy.button}
              </Button>
              <Button
                onClick={() => {
                  setAuthMode('login')
                  onClearStatus()
                }}
                type="button"
                variant="outline"
              >
                {t('auth.backToSignIn')}
              </Button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
