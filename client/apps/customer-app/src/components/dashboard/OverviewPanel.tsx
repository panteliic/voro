import { CreditCard, MapPin, PackageCheck } from 'lucide-react'
import { useI18n } from '../../i18n/i18n'
import { recentOrders } from './data/dashboardData'

type OverviewPanelProps = {
  addressCount: number
  name: string
  paymentMethodCount: number
}

export function OverviewPanel({ addressCount, name, paymentMethodCount }: OverviewPanelProps) {
  const { t } = useI18n()
  const summaryCards = [
    { label: t('overview.activeOrder'), value: '1', icon: PackageCheck },
    { label: t('overview.savedAddresses'), value: String(addressCount), icon: MapPin },
    { label: t('overview.paymentMethods'), value: String(paymentMethodCount), icon: CreditCard },
  ]
  const orderStatusKeys = [
    'overview.arriving',
    'overview.deliveredYesterday',
    'overview.deliveredDate',
  ]

  return (
    <div className="grid gap-5">
      <section className="rounded-voro-lg border border-line bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">{t('overview.welcome')}</p>
        <h1 className="mt-2 text-2xl font-bold text-content">
          {t('overview.title', { name })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t('overview.desc')}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ icon: Icon, label, value }) => (
          <article className="rounded-voro-lg border border-line bg-card p-4" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-action" />
            </div>
            <p className="mt-3 text-2xl font-bold text-content">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-voro-lg border border-line bg-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-content">{t('overview.recentOrders')}</h2>
        </div>
        <div className="divide-y divide-line">
          {recentOrders.map((order, index) => (
            <div
              className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              key={order.id}
            >
              <div>
                <p className="font-medium text-content">{order.restaurant}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.id} · {t(orderStatusKeys[index] ?? 'overview.arriving')}
                </p>
              </div>
              <p className="text-sm font-bold text-content">{order.total}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
