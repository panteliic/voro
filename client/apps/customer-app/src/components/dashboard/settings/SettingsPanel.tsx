import type { Dispatch, SetStateAction } from 'react'
import { ChevronLeft } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { settingsNavItems } from '../data/dashboardData'
import type { ActiveSettingsSection } from '../types'
import { useI18n } from '../../../i18n/i18n'
import type { CustomerProfile } from '../../../types/customer'
import { AccountSettings } from './AccountSettings'
import { DeliverySettings } from './DeliverySettings'
import { NotificationSettings } from './NotificationSettings'
import { PaymentSettings } from './PaymentSettings'
import { SecuritySettings } from './SecuritySettings'
import { ThemeSettings } from './ThemeSettings'

type SettingsPanelProps = {
  activeSection: ActiveSettingsSection
  profile: CustomerProfile | null
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

export function SettingsPanel({
  activeSection,
  profile,
  setProfile,
}: SettingsPanelProps) {
  const { t } = useI18n()

  if (!profile) {
    return (
      <section className="rounded-voro-lg border border-line bg-card p-5">
        <p className="text-sm text-muted-foreground">{t('common.loadingProfile')}</p>
      </section>
    )
  }

  const settingsList = (
    <aside className="self-start border-line bg-transparent lg:rounded-voro-lg lg:border lg:bg-card lg:p-2">
      {settingsNavItems.map(({ icon: Icon, id, path }) => {
        const isActive = activeSection === id

        return (
          <NavLink
            className={`flex w-full cursor-pointer items-start gap-3 border-b border-line/60 px-0 py-4 text-left transition last:border-b-0 lg:rounded-voro-md lg:border-b-0 lg:px-3 lg:py-3 ${
              isActive
                ? 'text-content lg:bg-accent'
                : 'text-muted-foreground hover:text-content lg:hover:bg-muted'
            }`}
            key={id}
            to={path}
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{t(`settings.${id}.label`)}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {t(`settings.${id}.desc`)}
              </span>
            </span>
          </NavLink>
        )
      })}
    </aside>
  )

  if (!activeSection) {
    return (
      <div className="grid gap-4 lg:gap-5">
        <section className="lg:hidden">
          <h1 className="text-2xl font-bold text-content">{t('settings.title')}</h1>
        </section>

        <section className="hidden rounded-voro-lg border border-line bg-card p-5 lg:block">
          <h1 className="text-2xl font-bold text-content">{t('settings.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('settings.desc')}
          </p>
        </section>

        {settingsList}
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2 lg:hidden">
        <NavLink
          aria-label={t('settings.title')}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-voro-md border border-line bg-card text-content transition hover:bg-accent"
          to="/settings"
        >
          <ChevronLeft className="size-5" />
        </NavLink>
        <h1 className="text-xl font-bold text-content">{t(`settings.${activeSection}.label`)}</h1>
      </div>

      <section className="hidden rounded-voro-lg border border-line bg-card p-5 lg:block">
        <h1 className="text-2xl font-bold text-content">{t('settings.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t('settings.desc')}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr] lg:items-start">
        <div className="hidden lg:block">{settingsList}</div>

        <section className="bg-transparent lg:rounded-voro-lg lg:border lg:border-line lg:bg-card lg:p-5">
          {activeSection === 'account' ? (
            <AccountSettings profile={profile} setProfile={setProfile} />
          ) : null}
          {activeSection === 'theme' ? (
            <ThemeSettings preferences={profile.preferences} setProfile={setProfile} />
          ) : null}
          {activeSection === 'delivery' ? (
            <DeliverySettings
              addresses={profile.addresses}
              preferences={profile.preferences}
              setProfile={setProfile}
            />
          ) : null}
          {activeSection === 'payments' ? (
            <PaymentSettings paymentMethods={profile.paymentMethods} setProfile={setProfile} />
          ) : null}
          {activeSection === 'notifications' ? (
            <NotificationSettings preferences={profile.preferences} setProfile={setProfile} />
          ) : null}
          {activeSection === 'security' ? (
            <SecuritySettings preferences={profile.preferences} setProfile={setProfile} />
          ) : null}
        </section>
      </div>
    </div>
  )
}
