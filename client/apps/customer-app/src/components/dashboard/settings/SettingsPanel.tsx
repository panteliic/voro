import type { Dispatch, SetStateAction } from 'react'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { settingsNavItems } from '../data/dashboardData'
import type { ActiveSettingsSection, SettingsSection } from '../types'
import { useI18n } from '../../../i18n/i18n'
import type { CustomerProfile } from '../../../types/customer'
import { AccountSettings } from './AccountSettings'
import { DeliverySettings } from './DeliverySettings'
import { NotificationSettings } from './NotificationSettings'
import { PaymentSettings } from './PaymentSettings'
import { SecuritySettings } from './SecuritySettings'
import { ThemeSettings } from './ThemeSettings'
import { SupportSettings } from './SupportSettings'

type SettingsPanelProps = {
  activeSection: ActiveSettingsSection
  profile: CustomerProfile | null
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

const settingsGroups: Array<{
  descriptionKey: string
  itemIds: SettingsSection[]
  titleKey: string
}> = [
  {
    titleKey: 'settings.group.account.title',
    descriptionKey: 'settings.group.account.desc',
    itemIds: ['account', 'security', 'support'],
  },
  {
    titleKey: 'settings.group.ordering.title',
    descriptionKey: 'settings.group.ordering.desc',
    itemIds: ['delivery', 'payments'],
  },
  {
    titleKey: 'settings.group.app.title',
    descriptionKey: 'settings.group.app.desc',
    itemIds: ['notifications', 'theme'],
  },
]

function itemsForGroup(itemIds: SettingsSection[]) {
  return itemIds
    .map((itemId) => settingsNavItems.find((item) => item.id === itemId))
    .filter((item): item is (typeof settingsNavItems)[number] => Boolean(item))
}

export function SettingsPanel({
  activeSection,
  profile,
  setProfile,
}: SettingsPanelProps) {
  const { t } = useI18n()
  const activeItem = settingsNavItems.find((item) => item.id === activeSection)

  if (!profile) {
    return (
      <section className="rounded-voro-lg border border-line bg-card p-5">
        <p className="text-sm text-muted-foreground">{t('common.loadingProfile')}</p>
      </section>
    )
  }

  const settingsList = (
    <aside className="rounded-voro-xl border border-line bg-card p-2">
      <NavLink
        className="mb-1 flex items-center gap-3 rounded-voro-lg px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-content"
        to="/settings"
      >
        <span className="grid size-7 place-items-center rounded-voro-md bg-muted text-xs font-bold text-content">V</span>
        {t('settings.title')}
      </NavLink>
      {settingsGroups.map((group) => (
        <div className="border-t border-line px-1 py-3 first:border-t-0" key={group.titleKey}>
          <p className="px-2 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t(group.titleKey)}
          </p>
          <div className="grid gap-1">
            {itemsForGroup(group.itemIds).map(({ icon: Icon, id, path }) => {
              const isActive = activeSection === id

              return (
                <NavLink
                  className={`flex items-center gap-3 rounded-voro-md px-2 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? 'bg-accent text-content'
                      : 'text-muted-foreground hover:bg-muted hover:text-content'
                  }`}
                  key={id}
                  to={path}
                >
                  <Icon className="size-4 shrink-0" />
                  {t(`settings.${id}.label`)}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </aside>
  )

  if (!activeSection) {
    return (
      <div className="grid gap-7">
        <header className="rounded-voro-xl border border-line bg-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('settings.kicker')}</p>
          <h1 className="mt-3 text-2xl font-bold text-content sm:text-3xl">{t('settings.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('settings.desc')}</p>
        </header>

        {settingsGroups.map((group) => (
          <section key={group.titleKey}>
            <div className="mb-3">
              <h2 className="text-base font-bold text-content">{t(group.titleKey)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(group.descriptionKey)}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {itemsForGroup(group.itemIds).map(({ icon: Icon, id, path }) => (
                <NavLink
                  className="group flex min-h-32 items-start gap-4 rounded-voro-xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-action/50 hover:shadow-voro-sm"
                  key={id}
                  to={path}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-voro-lg bg-accent text-action">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-content">{t(`settings.${id}.label`)}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-action" />
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {t(`settings.${id}.desc`)}
                    </span>
                  </span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:items-start">
      <div className="hidden lg:block lg:sticky lg:top-5">{settingsList}</div>

      <div className="grid gap-4">
        <div className="flex items-center gap-3 lg:hidden">
          <NavLink
            aria-label={t('settings.title')}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-voro-md border border-line bg-card text-content transition hover:bg-accent"
            to="/settings"
          >
            <ChevronLeft className="size-5" />
          </NavLink>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('settings.title')}</p>
            <h1 className="text-xl font-bold text-content">{activeItem ? t(`settings.${activeItem.id}.label`) : ''}</h1>
          </div>
        </div>

        <section className="rounded-voro-xl border border-line bg-card p-4 sm:p-5">
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
          {activeSection === 'support' ? <SupportSettings /> : null}
        </section>
      </div>
    </div>
  )
}
