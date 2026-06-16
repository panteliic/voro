import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@voro/ui'
import { UserRound } from 'lucide-react'
import { useAppDispatch } from '../../../app/hooks'
import { updateAuthUser } from '../../../features/auth/authSlice'
import { useI18n, type Language } from '../../../i18n/i18n'
import { customerApi } from '../../../services/customerApi'
import type { CustomerProfile } from '../../../types/customer'
import { SettingRow } from './SettingRow'
import { SettingsSectionLayout } from './SettingsSectionLayout'

type AccountSettingsProps = {
  profile: CustomerProfile
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

export function AccountSettings({ profile, setProfile }: AccountSettingsProps) {
  const dispatch = useAppDispatch()
  const { language, setLanguage, t } = useI18n()
  const [name, setName] = useState(profile.user.name)
  const [phone, setPhone] = useState(profile.user.phone)
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(profile.user.name)
    setPhone(profile.user.phone)
  }, [profile.user.name, profile.user.phone])

  async function handleSave() {
    setIsSaving(true)
    setStatus('')

    try {
      const result = await customerApi.updateProfile({ name, phone })
      setProfile((current) => (current ? { ...current, user: result.user } : current))
      dispatch(updateAuthUser(result.user))
      setStatus(t('account.saved'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('account.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsSectionLayout
      description={t('account.description')}
      icon={UserRound}
      title={t('settings.account.label')}
    >
      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('account.displayName')}
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('account.phone')}
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+381 60 123 4567"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{status}</p>
          <Button disabled={isSaving} onClick={handleSave} type="button">
            {isSaving ? t('common.saving') : t('account.save')}
          </Button>
        </div>
      </div>

      <SettingRow label={t('common.email')} value={profile.user.email} />
      <SettingRow
        action={
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('common.english')}</SelectItem>
              <SelectItem value="sr">{t('common.serbian')}</SelectItem>
            </SelectContent>
          </Select>
        }
        label={t('account.language')}
        value={language === 'sr' ? t('common.serbian') : t('common.english')}
      />
    </SettingsSectionLayout>
  )
}
