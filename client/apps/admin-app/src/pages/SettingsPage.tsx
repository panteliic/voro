import { Button } from '@voro/ui'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n/i18n'

export function SettingsPage() {
  const { logout, user } = useAuth()
  const { t } = useI18n()

  return (
    <div className="grid max-w-2xl gap-5">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.desc')}</p>
      </div>
      <section className="rounded-voro-lg border border-line bg-card p-4">
        <h2 className="text-lg font-bold">{t('settings.profile')}</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="font-bold text-muted-foreground">{t('settings.name')}</dt>
            <dd>{user?.name || 'Admin'}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted-foreground">{t('settings.email')}</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted-foreground">{t('settings.role')}</dt>
            <dd>{user?.role}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-voro-lg border border-line bg-card p-4">
        <h2 className="text-lg font-bold">{t('settings.session')}</h2>
        <Button className="mt-4" onClick={logout} type="button" variant="outline">
          {t('common.logout')}
        </Button>
      </section>
    </div>
  )
}
