import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Switch } from '@voro/ui'
import { Download, Eye, EyeOff, Laptop, LockKeyhole, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { useAppDispatch } from '../../../app/hooks'
import { logout } from '../../../features/auth/authSlice'
import { useI18n } from '../../../i18n/i18n'
import { authApi } from '../../../services/authApi'
import { customerApi } from '../../../services/customerApi'
import type { CustomerPreferences, CustomerProfile, CustomerSession } from '../../../types/customer'
import { SettingsSectionLayout } from './SettingsSectionLayout'

type SecuritySettingsProps = {
  preferences: CustomerPreferences
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

type PasswordErrors = {
  confirmPassword?: string
  currentPassword?: string
  newPassword?: string
}

type PasswordInputProps = {
  autoComplete: string
  error?: string
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}

function PasswordInput({
  autoComplete,
  error,
  label,
  onChange,
  placeholder,
  value,
}: PasswordInputProps) {
  const { t } = useI18n()
  const [isVisible, setIsVisible] = useState(false)
  const ToggleIcon = isVisible ? EyeOff : Eye

  return (
    <label className="grid gap-2 text-sm font-bold text-content">
      {label}
      <div className="relative">
        <Input
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className="pr-10"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={isVisible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={t(isVisible ? 'common.hidePassword' : 'common.showPassword')}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-voro-md text-muted-foreground transition hover:bg-accent hover:text-content"
          onClick={() => setIsVisible((visible) => !visible)}
          type="button"
        >
          <ToggleIcon className="size-4" />
        </button>
      </div>
      {error ? <span className="text-xs font-bold text-destructive">{error}</span> : null}
    </label>
  )
}

export function SecuritySettings({ preferences, setProfile }: SecuritySettingsProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { language, t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [passwordStatus, setPasswordStatus] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState('')
  const [isManagingPrivacy, setIsManagingPrivacy] = useState(false)
  const [sessions, setSessions] = useState<CustomerSession[]>([])
  const [sessionsStatus, setSessionsStatus] = useState('')
  const [isManagingSessions, setIsManagingSessions] = useState(false)

  async function loadSessions() {
    setIsManagingSessions(true)
    setSessionsStatus('')
    try {
      const result = await customerApi.getSessions()
      setSessions(result.sessions)
    } catch (error) {
      setSessionsStatus(error instanceof Error ? error.message : t('security.sessionsError'))
    } finally {
      setIsManagingSessions(false)
    }
  }

  useEffect(() => {
    void loadSessions()
  }, [])

  async function revokeSession(sessionId: number) {
    setIsManagingSessions(true)
    setSessionsStatus('')
    try {
      await customerApi.revokeSession(sessionId)
      await loadSessions()
      setSessionsStatus(t('security.sessionSignedOut'))
    } catch (error) {
      setSessionsStatus(error instanceof Error ? error.message : t('security.sessionsError'))
    } finally {
      setIsManagingSessions(false)
    }
  }

  async function revokeOtherSessions() {
    if (!window.confirm(t('security.signOutOthersConfirm'))) return
    setIsManagingSessions(true)
    setSessionsStatus('')
    try {
      await customerApi.revokeOtherSessions()
      await loadSessions()
      setSessionsStatus(t('security.otherSessionsSignedOut'))
    } catch (error) {
      setSessionsStatus(error instanceof Error ? error.message : t('security.sessionsError'))
    } finally {
      setIsManagingSessions(false)
    }
  }

  function sessionDate(value: string) {
    return new Date(value).toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US')
  }

  async function updatePreference(key: keyof CustomerPreferences, value: boolean) {
    const result = await customerApi.updatePreferences({ ...preferences, [key]: value })
    setProfile((current) => (current ? { ...current, preferences: result.preferences } : current))
  }

  function validatePasswordForm() {
    const errors: PasswordErrors = {}

    if (!currentPassword) {
      errors.currentPassword = t('security.passwordRequired')
    }

    if (!newPassword) {
      errors.newPassword = t('security.passwordRequired')
    } else if (newPassword.length < 8) {
      errors.newPassword = t('security.passwordMinLength')
    } else if (currentPassword && currentPassword === newPassword) {
      errors.newPassword = t('security.passwordDifferent')
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('security.passwordRequired')
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = t('security.passwordMismatch')
    }

    return errors
  }

  async function handleChangePassword() {
    setPasswordStatus('')
    const nextErrors = validatePasswordForm()
    setPasswordErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsChangingPassword(true)

    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setPasswordStatus(t('security.passwordChanged'))
      dispatch(logout())
      navigate('/login', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('account.error')

      if (message.toLowerCase().includes('current password')) {
        setPasswordErrors({ currentPassword: t('security.currentPasswordIncorrect') })
        setPasswordStatus(t('security.currentPasswordIncorrect'))
        return
      }

      setPasswordStatus(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function downloadPersonalData() {
    setIsManagingPrivacy(true)
    setPrivacyStatus('')
    try {
      const data = await customerApi.exportPersonalData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voro-personal-data-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setPrivacyStatus(t('security.exported'))
    } catch (error) {
      setPrivacyStatus(error instanceof Error ? error.message : t('account.error'))
    } finally {
      setIsManagingPrivacy(false)
    }
  }

  async function deleteAccount() {
    if (!window.confirm(t('security.deleteConfirm'))) return
    setIsManagingPrivacy(true)
    setPrivacyStatus('')
    try {
      await customerApi.deleteAccount()
      dispatch(logout())
      navigate('/login', { replace: true })
    } catch (error) {
      setPrivacyStatus(error instanceof Error ? error.message : t('security.deleteError'))
      setIsManagingPrivacy(false)
    }
  }

  return (
    <SettingsSectionLayout
      description={t('security.description')}
      icon={LockKeyhole}
      title={t('security.title')}
    >
      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <div>
          <p className="text-sm font-bold text-content">{t('security.password')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('security.passwordUpdated')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <PasswordInput
            autoComplete="current-password"
            error={passwordErrors.currentPassword}
            label={t('security.currentPassword')}
            onChange={(value) => {
              setCurrentPassword(value)
              setPasswordStatus('')
              setPasswordErrors((current) => ({ ...current, currentPassword: undefined }))
            }}
            placeholder={t('security.currentPasswordPlaceholder')}
            value={currentPassword}
          />
          <PasswordInput
            autoComplete="new-password"
            error={passwordErrors.newPassword}
            label={t('security.newPassword')}
            onChange={(value) => {
              setNewPassword(value)
              setPasswordStatus('')
              setPasswordErrors((current) => ({ ...current, newPassword: undefined }))
            }}
            placeholder={t('security.newPasswordPlaceholder')}
            value={newPassword}
          />
          <PasswordInput
            autoComplete="new-password"
            error={passwordErrors.confirmPassword}
            label={t('security.confirmNewPassword')}
            onChange={(value) => {
              setConfirmPassword(value)
              setPasswordStatus('')
              setPasswordErrors((current) => ({ ...current, confirmPassword: undefined }))
            }}
            placeholder={t('security.confirmNewPasswordPlaceholder')}
            value={confirmPassword}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-destructive">{passwordStatus}</p>
          <Button
            disabled={isChangingPassword}
            onClick={() => void handleChangePassword()}
            type="button"
          >
            {isChangingPassword ? t('security.changingPassword') : t('security.changePassword')}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-bold text-content">{t('security.twoStep')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('security.twoStepDesc')}</p>
        </div>
        <Switch
          checked={preferences.twoStepVerification}
          onCheckedChange={(checked) =>
            void updatePreference('twoStepVerification', checked)
          }
        />
      </div>
      <div className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-4">
        <div>
          <p className="text-sm font-bold text-content">{t('security.privacyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('security.privacyDesc')}</p>
        </div>
        {privacyStatus ? <p className="text-sm font-medium text-muted-foreground">{privacyStatus}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={isManagingPrivacy} onClick={() => void downloadPersonalData()} type="button" variant="outline"><Download className="size-4" />{t('security.exportData')}</Button>
          <Button disabled={isManagingPrivacy} onClick={() => void deleteAccount()} type="button" variant="destructive"><Trash2 className="size-4" />{t('security.deleteAccount')}</Button>
        </div>
      </div>
      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-content">{t('security.sessions')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('security.sessionsDesc')}</p>
          </div>
          <Button aria-label={t('security.refreshSessions')} disabled={isManagingSessions} onClick={() => void loadSessions()} size="icon" type="button" variant="outline"><RefreshCw className={`size-4 ${isManagingSessions ? 'animate-spin' : ''}`} /></Button>
        </div>
        {sessionsStatus ? <p className="text-sm font-medium text-muted-foreground">{sessionsStatus}</p> : null}
        <div className="grid gap-2">
          {sessions.map((session) => <article className="flex flex-wrap items-center justify-between gap-3 rounded-voro-md border border-line bg-card px-3 py-3" key={session.id}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><Laptop className="size-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-content">{session.deviceLabel || t('security.unknownDevice')} {session.isCurrent ? <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-action">{t('security.currentDevice')}</span> : null}</p>
                <p className="mt-1 text-xs text-muted-foreground">{session.ipAddress ? `${session.ipAddress} · ` : ''}{t('security.lastActive', { date: sessionDate(session.lastActiveAt) })}</p>
              </div>
            </div>
            {!session.isCurrent ? <Button disabled={isManagingSessions} onClick={() => void revokeSession(session.id)} size="sm" type="button" variant="outline"><LogOut className="size-4" />{t('security.signOutDevice')}</Button> : null}
          </article>)}
          {!isManagingSessions && sessions.length === 0 ? <p className="rounded-voro-md border border-dashed border-line px-3 py-4 text-sm text-muted-foreground">{t('security.sessionsEmpty')}</p> : null}
        </div>
        {sessions.some((session) => !session.isCurrent) ? <div className="flex justify-end"><Button disabled={isManagingSessions} onClick={() => void revokeOtherSessions()} type="button" variant="outline"><LogOut className="size-4" />{t('security.signOutOthers')}</Button></div> : null}
      </div>
      <div className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-bold text-content">{t('security.recommendations')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('security.recommendationsDesc')}
          </p>
        </div>
        <Switch
          checked={preferences.personalizedRecommendations}
          onCheckedChange={(checked) =>
            void updatePreference('personalizedRecommendations', checked)
          }
        />
      </div>
    </SettingsSectionLayout>
  )
}
