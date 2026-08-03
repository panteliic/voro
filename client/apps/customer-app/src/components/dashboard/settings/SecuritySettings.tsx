import { useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Switch } from '@voro/ui'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useAppDispatch } from '../../../app/hooks'
import { logout } from '../../../features/auth/authSlice'
import { useI18n } from '../../../i18n/i18n'
import { authApi } from '../../../services/authApi'
import { customerApi } from '../../../services/customerApi'
import type { CustomerPreferences, CustomerProfile } from '../../../types/customer'
import { SettingRow } from './SettingRow'
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
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [passwordStatus, setPasswordStatus] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  async function exportAccountData() {
    setPrivacyStatus('')
    try {
      const data = await customerApi.exportAccountData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'voro-account-data.json'
      anchor.click()
      URL.revokeObjectURL(url)
      setPrivacyStatus(t('security.exported'))
    } catch (error) {
      setPrivacyStatus(error instanceof Error ? error.message : t('security.privacyError'))
    }
  }

  async function deleteAccount() {
    setPrivacyStatus('')
    setIsDeleting(true)
    try {
      await customerApi.deleteAccount(deleteConfirmation)
      dispatch(logout())
      navigate('/login', { replace: true })
    } catch (error) {
      setPrivacyStatus(error instanceof Error ? error.message : t('security.privacyError'))
    } finally {
      setIsDeleting(false)
    }
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
      <SettingRow label={t('security.sessions')} value={t('security.sessionsDesc')} />
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
      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <div>
          <p className="text-sm font-bold text-content">{t('security.privacyControls')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('security.privacyControlsDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void exportAccountData()} type="button" variant="outline">{t('security.exportData')}</Button>
        </div>
        <div className="grid gap-3 rounded-voro-md border border-destructive/30 bg-destructive/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-bold text-content">
            {t('security.deleteConfirm')}
            <Input onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="DELETE" value={deleteConfirmation} />
          </label>
          <Button disabled={deleteConfirmation !== 'DELETE' || isDeleting} onClick={() => void deleteAccount()} type="button" variant="destructive">
            {isDeleting ? t('common.saving') : t('security.deleteAccount')}
          </Button>
        </div>
        {privacyStatus ? <p className="text-sm font-medium text-muted-foreground">{privacyStatus}</p> : null}
      </div>
    </SettingsSectionLayout>
  )
}
