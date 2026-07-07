import { Bell, CheckCircle2, Flame, Utensils, type LucideIcon } from 'lucide-react'
import type { DashboardResponse } from '../../types/restaurant'
import { demoOrders } from '../../data/demoOrders'
import { useI18n } from '../../i18n/i18n'

type StatItem = {
  labelKey: string
  value: string
  icon: LucideIcon
}

export function StatsCards({ dashboard }: { dashboard: DashboardResponse | null }) {
  const { t } = useI18n()
  const activeOrders = demoOrders.filter((order) =>
    ['New', 'Preparing', 'Ready'].includes(order.status),
  )
  const stats: StatItem[] = [
    {
      labelKey: 'stats.newOrders',
      value: String(activeOrders.filter((order) => order.status === 'New').length),
      icon: Bell,
    },
    {
      labelKey: 'stats.preparing',
      value: String(activeOrders.filter((order) => order.status === 'Preparing').length),
      icon: Flame,
    },
    {
      labelKey: 'stats.ready',
      value: String(activeOrders.filter((order) => order.status === 'Ready').length),
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
