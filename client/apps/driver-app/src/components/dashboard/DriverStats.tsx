import type { DashboardResponse } from '../../types/driver'
import { translate, type DriverLanguage } from '../../i18n'

export function DriverStats({ dashboard }: { dashboard: DashboardResponse | null }) {
  const language: DriverLanguage = localStorage.getItem('voro-driver-language') === 'en' ? 'en' : 'sr'
  const t = (key: string) => translate(language, key)
  const driver = dashboard?.driver
  const location =
    driver?.currentLatitude !== null && driver?.currentLatitude !== undefined &&
    driver?.currentLongitude !== null && driver?.currentLongitude !== undefined
      ? `${driver.currentLatitude.toFixed(4)}, ${driver.currentLongitude.toFixed(4)}`
      : t('stats.noLocation')

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">{t('stats.workStatus')}</p>
        <p className="mt-2 text-2xl font-bold">
          {driver?.isOnline ? t('common.online') : t('common.offline')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {driver?.isAvailable ? t('stats.ready') : t('stats.unavailable')}
        </p>
      </article>
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">{t('stats.vehicle')}</p>
        <p className="mt-2 text-2xl font-bold">
          {dashboard?.driver.vehicleType || t('stats.notSet')}
        </p>
      </article>
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">{t('stats.activeDeliveries')}</p>
        <p className="mt-2 text-2xl font-bold">{dashboard?.deliveries.length || 0}</p>
      </article>
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">{t('stats.testLocation')}</p>
        <p className="mt-2 text-base font-bold">{location}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('stats.closestDriver')}</p>
      </article>
    </section>
  )
}
