import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button, Input } from '@voro/ui'
import { ClipboardList, Settings2 } from 'lucide-react'
import { PublicHeader } from '../components/layout/PublicHeader'
import { useI18n } from '../i18n/i18n'
import type { AuthMode, LoginPayload, SetupPasswordPayload, SetupPurpose } from '../types/auth'
import { emptySetup } from '../utils/forms'

type AuthPageProps = {
  status: string
  isLoading: boolean
  isSettingPassword: boolean
  onLogin: (payload: LoginPayload) => Promise<void>
  onRequestPasswordReset: (email: string) => Promise<{ resetUrl?: string }>
  onSetupPassword: (payload: SetupPasswordPayload) => Promise<void>
  onClearStatus: () => void
}

export function AuthPage({
  status,
  isLoading,
  isSettingPassword,
  onClearStatus,
  onLogin,
  onRequestPasswordReset,
  onSetupPassword,
}: AuthPageProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [setupPurpose, setSetupPurpose] = useState<SetupPurpose>('firstAccess')
  const [setupForm, setSetupForm] = useState(emptySetup)
  const [isRequestingReset, setIsRequestingReset] = useState(false)
  const [resetNotice, setResetNotice] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invitedEmail = params.get('email')?.trim()
    const resetToken = params.get('token')?.trim()

    if (!resetToken && (params.get('access') !== '1' || !invitedEmail)) return

    setSetupPurpose(params.get('reset') === '1' ? 'passwordReset' : 'firstAccess')
    setSetupForm((current) => ({ ...current, email: invitedEmail || '', resetToken: resetToken || '' }))
    setAuthMode('setup')
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const setupCopy = useMemo(
    () =>
      setupPurpose === 'firstAccess'
        ? {
            title: t('auth.firstAccessTitle'),
            description: t('auth.firstAccessDesc'),
            button: t('auth.createPassword'),
          }
        : {
            title: t('auth.passwordResetTitle'),
            description: t('auth.passwordResetDesc'),
            button: t('auth.setNewPassword'),
          },
    [setupPurpose, t],
  )

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

  async function requestResetCode() {
    const resetEmail = setupForm.email.trim()
    if (!resetEmail || isRequestingReset) return

    setIsRequestingReset(true)
    setResetNotice('')
    try {
      const result = await onRequestPasswordReset(resetEmail)
      if (result.resetUrl && import.meta.env.DEV) {
        setResetNotice(result.resetUrl)
      } else {
        setResetNotice(t('auth.resetCodeSent'))
      }
    } catch {
      // The parent surfaces the API error beside the form.
    } finally {
      setIsRequestingReset(false)
    }
  }

  function openSetup(nextPurpose: SetupPurpose) {
    setSetupPurpose(nextPurpose)
    setAuthMode('setup')
    setResetNotice('')
    onClearStatus()
  }

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] bg-background text-content">
      <PublicHeader />
      <div className="grid place-items-center px-4 py-8">
        {authMode === 'login' ? (
          <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-5 shadow-xl shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">{t('auth.signIn')}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInDesc')}</p>
              </div>
              <ClipboardList className="size-5 text-action" />
            </div>
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
                {isLoading ? t('auth.opening') : t('auth.openConsole')}
              </Button>
            </form>
            <div className="mt-5 grid gap-2 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {t('auth.setupCodeAccess')}
              </p>
              <Button onClick={() => openSetup('passwordReset')} type="button" variant="outline">
                {t('auth.resetPassword')}
              </Button>
            </div>
          </section>
        ) : (
          <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-5 shadow-xl shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">{setupCopy.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{setupCopy.description}</p>
              </div>
              <Settings2 className="size-5 text-action" />
            </div>
            <form className="mt-5 grid gap-3" onSubmit={handleSetupPassword}>
              {!(setupPurpose === 'passwordReset' && setupForm.resetToken) ? <Input
                placeholder={t('auth.restaurantEmail')}
                value={setupForm.email}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, email: event.target.value }))
                }
              /> : null}
              {setupPurpose === 'firstAccess' && !setupForm.resetToken ? <Input
                placeholder={t('auth.setupCode')}
                value={setupForm.setupCode || ''}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, setupCode: event.target.value }))
                }
              /> : null}
              {setupPurpose === 'passwordReset' && !setupForm.resetToken ? (
                <Button
                  disabled={!setupForm.email.trim() || isRequestingReset}
                  onClick={() => void requestResetCode()}
                  type="button"
                  variant="outline"
                >
                  {isRequestingReset ? t('auth.sendingResetCode') : t('auth.requestResetCode')}
                </Button>
              ) : null}
              {setupPurpose === 'firstAccess' || setupForm.resetToken ? <Input
                placeholder={
                  setupPurpose === 'firstAccess'
                    ? t('auth.createPassword')
                    : t('auth.createNewPassword')
                }
                type="password"
                value={setupForm.password}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, password: event.target.value }))
                }
              /> : null}
              {resetNotice ? (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {resetNotice}
                </p>
              ) : null}
              {status ? <p className="text-sm font-medium text-destructive">{status}</p> : null}
              {setupPurpose === 'firstAccess' || setupForm.resetToken ? <Button disabled={isSettingPassword} type="submit">
                {isSettingPassword ? t('auth.savingPassword') : setupCopy.button}
              </Button> : null}
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
