import { Bell, CheckCircle2, Flame, Utensils, type LucideIcon } from 'lucide-react'
import type { DashboardResponse } from '../../types/restaurant'
import { useI18n } from '../../i18n/i18n'

type StatItem = {
  labelKey: string
  value: string
  icon: LucideIcon
}

export function StatsCards({ dashboard }: { dashboard: DashboardResponse | null }) {
  const { t } = useI18n()
  const orders = dashboard?.orders || []
  const stats: StatItem[] = [
    {
      labelKey: 'stats.newOrders',
      value: String(orders.filter((order) => order.status === 'pending').length),
      icon: Bell,
    },
    {
      labelKey: 'stats.preparing',
      value: String(orders.filter((order) => ['accepted', 'preparing'].includes(order.status)).length),
      icon: Flame,
    },
    {
      labelKey: 'stats.ready',
      value: String(orders.filter((order) => order.status === 'ready').length),
      icon: CheckCircle2,
    },
    { labelKey: 'stats.activeItems', value: String(dashboard?.products.length || 0), icon: Utensils },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {stats.map(({ icon: Icon, labelKey, value }) => (
        <div className="rounded-voro-lg border border-line bg-card p-4" key={labelKey}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-muted-foreground">{t(labelKey)}</p>
            <Icon className="size-4 text-action" />
          </div>
          <p className="mt-3 text-2xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  )
}
