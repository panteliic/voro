import { FormEvent, useMemo, useState } from 'react'
import { Button, Input } from '@voro/ui'
import { PublicHeader } from '../components/layout/PublicHeader'
import type { AuthMode, LoginPayload, SetupPasswordPayload, SetupPurpose } from '../types/auth'
import { emptySetup } from '../utils/forms'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [setupPurpose, setSetupPurpose] = useState<SetupPurpose>('firstAccess')
  const [setupForm, setSetupForm] = useState(emptySetup)

  const setupCopy = useMemo(
    () =>
      setupPurpose === 'firstAccess'
        ? {
            title: 'First driver access',
            description: 'Use the admin invite code once, then create your password.',
            button: 'Create password',
          }
        : {
            title: 'Password reset',
            description: 'Use the new code from admin to replace the old password.',
            button: 'Set new password',
          },
    [setupPurpose],
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

  function openSetup(nextPurpose: SetupPurpose) {
    setSetupPurpose(nextPurpose)
    setAuthMode('setup')
    onClearStatus()
  }

  return (
    <main className="min-h-screen bg-background text-content">
      <PublicHeader />
      <div className="mx-auto grid max-w-5xl px-4 py-8">
        {authMode === 'login' ? (
          <section className="mx-auto w-full max-w-md rounded-voro-lg border border-line bg-card p-5">
            <h1 className="text-xl font-bold">Driver sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open your delivery dashboard.
            </p>
            <form className="mt-5 grid gap-3" onSubmit={handleLogin}>
              <Input
                placeholder="Driver email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {status ? <p className="text-sm font-medium text-destructive">{status}</p> : null}
              <Button disabled={isLoading} type="submit" variant="outline">
                {isLoading ? 'Opening driver app...' : 'Open driver app'}
              </Button>
            </form>
            <div className="mt-5 grid gap-2 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Setup code access
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => openSetup('firstAccess')} type="button" variant="outline">
                  First access
                </Button>
                <Button onClick={() => openSetup('passwordReset')} type="button" variant="outline">
                  Reset password
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-md rounded-voro-lg border border-line bg-card p-5">
            <h1 className="text-xl font-bold">{setupCopy.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{setupCopy.description}</p>
            <form className="mt-5 grid gap-3" onSubmit={handleSetupPassword}>
              <Input
                placeholder="Driver email"
                value={setupForm.email}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <Input
                placeholder="Setup code from admin"
                value={setupForm.setupCode}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, setupCode: event.target.value }))
                }
              />
              <Input
                placeholder={setupPurpose === 'firstAccess' ? 'Create driver password' : 'Create new password'}
                type="password"
                value={setupForm.password}
                onChange={(event) =>
                  setSetupForm((current) => ({ ...current, password: event.target.value }))
                }
              />
              {status ? <p className="text-sm font-medium text-destructive">{status}</p> : null}
              <Button disabled={isSettingPassword} type="submit">
                {isSettingPassword ? 'Saving password...' : setupCopy.button}
              </Button>
              <Button
                onClick={() => {
                  setAuthMode('login')
                  onClearStatus()
                }}
                type="button"
                variant="outline"
              >
                Back to sign in
              </Button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
