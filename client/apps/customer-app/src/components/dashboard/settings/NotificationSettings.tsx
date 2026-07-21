import { type Dispatch, type SetStateAction, useState } from 'react'
import { Switch } from '@voro/ui'
import { Bell } from 'lucide-react'
import { useI18n } from '../../../i18n/i18n'
import { customerApi } from '../../../services/customerApi'
import { enableCustomerPushNotifications } from '../../../services/pushNotifications'
import type { CustomerPreferences, CustomerProfile } from '../../../types/customer'
import { SettingsSectionLayout } from './SettingsSectionLayout'

type NotificationSettingsProps = {
  preferences: CustomerPreferences
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

export function NotificationSettings({ preferences, setProfile }: NotificationSettingsProps) {
  const { t } = useI18n()
  const [pushStatus, setPushStatus] = useState('')

  async function updatePreference(key: keyof CustomerPreferences, value: boolean) {
    const result = await customerApi.updatePreferences({ ...preferences, [key]: value })
    setProfile((current) => (current ? { ...current, preferences: result.preferences } : current))
  }

  async function enablePush() {
    try {
      await enableCustomerPushNotifications()
      setPushStatus(t('notifications.pushEnabled'))
    } catch {
      setPushStatus(t('notifications.pushError'))
    }
  }

  return (
    <SettingsSectionLayout
      description={t('notifications.description')}
      icon={Bell}
      title={t('settings.notifications.label')}
    >
      {[
        ['orderStatusNotifications', 'notifications.orderStatus', 'notifications.orderStatusDesc'],
        [
          'courierMessageNotifications',
          'notifications.courierMessages',
          'notifications.courierMessagesDesc',
        ],
        ['promotionNotifications', 'notifications.promotions', 'notifications.promotionsDesc'],
        [
          'receiptEmailNotifications',
          'notifications.receipts',
          'notifications.receiptsDesc',
        ],
      ].map(([key, labelKey, valueKey]) => (
        <div
          className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
          key={key}
        >
          <div>
            <p className="text-sm font-bold text-content">{t(labelKey)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(valueKey)}</p>
          </div>
          <Switch
            checked={Boolean(preferences[key as keyof CustomerPreferences])}
            onCheckedChange={(checked) =>
              void updatePreference(key as keyof CustomerPreferences, checked)
            }
          />
        </div>
      ))}
      <div className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div><p className="text-sm font-bold text-content">{t('notifications.pushTitle')}</p><p className="mt-1 text-sm text-muted-foreground">{t('notifications.pushDesc')}</p>{pushStatus ? <p className="mt-2 text-xs font-medium text-muted-foreground">{pushStatus}</p> : null}</div>
        <button className="rounded-voro-md bg-action px-3 py-2 text-sm font-bold text-action-text" onClick={() => void enablePush()} type="button">{t('notifications.pushEnable')}</button>
      </div>
    </SettingsSectionLayout>
  )
}
