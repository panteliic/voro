import { CheckCircle2, Clock3, ReceiptText, TrendingUp } from 'lucide-react'
import { StatsCards } from '../components/dashboard/StatsCards'
import { demoOrders } from '../data/demoOrders'
import { useI18n } from '../i18n/i18n'
import type { DashboardResponse } from '../types/restaurant'

const previousOrders = demoOrders.filter((order) =>
  ['Delivered', 'Cancelled'].includes(order.status),
)

function parseTotal(total: string) {
  return Number(total.replace(/[^\d]/g, '')) || 0
}

export function DashboardOverviewPage({ dashboard }: { dashboard: DashboardResponse | null }) {
  const { locale, t } = useI18n()
  const deliveredOrders = previousOrders.filter((order) => order.status === 'Delivered')
  const revenue = deliveredOrders.reduce((sum, order) => sum + parseTotal(order.total), 0)
  const averageTicket = deliveredOrders.length ? Math.round(revenue / deliveredOrders.length) : 0

  return (
    <section className="grid gap-5">
      <div className="rounded-voro-lg border border-line bg-card p-5">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.desc')}
        </p>
      </div>

      <StatsCards dashboard={dashboard} />

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-voro-lg border border-line bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-muted-foreground">{t('dashboard.completedToday')}</p>
            <CheckCircle2 className="size-4 text-action" />
          </div>
          <p className="mt-3 text-2xl font-bold">{deliveredOrders.length}</p>
        </article>
        <article className="rounded-voro-lg border border-line bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-muted-foreground">{t('dashboard.revenue')}</p>
            <TrendingUp className="size-4 text-action" />
          </div>
          <p className="mt-3 text-2xl font-bold">{revenue.toLocaleString(locale)} RSD</p>
        </article>
        <article className="rounded-voro-lg border border-line bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-muted-foreground">{t('dashboard.averageTicket')}</p>
            <ReceiptText className="size-4 text-action" />
          </div>
          <p className="mt-3 text-2xl font-bold">{averageTicket.toLocaleString(locale)} RSD</p>
        </article>
      </div>

      <section className="rounded-voro-lg border border-line bg-card">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-bold">{t('dashboard.previousOrders')}</h2>
        </div>
        <div className="divide-y divide-line">
          {previousOrders.map((order) => (
            <article className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto_auto]" key={order.id}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('common.order').toUpperCase()} {order.id}
                </p>
                <h3 className="mt-1 font-bold">{order.customer}</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {order.items.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" />
                {order.completedAt
                  ? new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(order.completedAt))
                  : t('dashboard.notCompleted')}
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="rounded-voro-md bg-muted px-2 py-1 text-xs font-bold">
                  {t(`status.${order.status}`)}
                </span>
                <p className="font-bold">{order.total}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
