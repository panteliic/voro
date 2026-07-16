import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CircleDollarSign, ClipboardList, Store, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AnalyticsBarChart } from '../components/analytics/AnalyticsBarChart'
import { AnalyticsMetric } from '../components/analytics/AnalyticsMetric'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { useI18n } from '../i18n/i18n'
import { getRestaurantAnalytics } from '../services/restaurantsApi'
import type { RestaurantAnalytics } from '../types/analytics'
import { formatRsd } from '../utils/currency'

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return null
  }

  return Math.round(((current - previous) / previous) * 100)
}

function readableStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export function RestaurantAnalyticsPage() {
  const { restaurantId } = useParams()
  const { t, language } = useI18n()
  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const result = await getRestaurantAnalytics(Number(restaurantId))
        if (isMounted) {
          setAnalytics(result)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('analytics.restaurantError'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [restaurantId, t])

  if (isLoading) {
    return <LoadingState label={t('analytics.loadingRestaurant')} />
  }

  if (error || !analytics) {
    return <p className="rounded-voro-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</p>
  }

  const weekChange = percentChange(analytics.summary.thisWeekAmount, analytics.summary.lastWeekAmount)
  const monthChange = percentChange(analytics.summary.thisMonthAmount, analytics.summary.lastMonthAmount)

  return (
    <div className="grid gap-5 lg:gap-6">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link aria-label={t('analytics.backRestaurants')} className="grid size-9 shrink-0 place-items-center rounded-voro-md border border-line bg-card text-muted-foreground hover:border-action hover:text-action" to="/restaurants">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="dashboard-eyebrow">{t('analytics.restaurantPerformance')}</p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">{analytics.restaurant.name}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{analytics.restaurant.categoryName || t('common.general')} · {analytics.restaurant.email}</p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-voro-md border px-3 py-2 text-xs font-bold ${analytics.restaurant.isActive ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
          <Store className="size-3.5" />
          {analytics.restaurant.isActive ? t('common.active') : t('common.inactive')}
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric helper={t('analytics.deliveredOnly')} icon={CircleDollarSign} label={t('analytics.totalRevenue')} value={formatRsd(analytics.summary.totalAmount)} />
        <AnalyticsMetric icon={ClipboardList} label={t('analytics.deliveredOrders')} value={analytics.summary.completedCount.toLocaleString()} />
        <AnalyticsMetric icon={TrendingUp} label={t('analytics.averageOrder')} value={formatRsd(analytics.summary.averageAmount)} />
        <AnalyticsMetric helper={t('analytics.inProgress')} icon={CalendarDays} label={t('analytics.activeOrders')} value={analytics.summary.activeCount.toLocaleString()} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <AnalyticsBarChart data={analytics.dailyRevenue} language={language} subtitle={t('analytics.dailyRevenueSubtitle')} title={t('analytics.dailyRevenue')} />
        <article className="admin-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <CalendarDays className="size-4 text-action" />
            <h2 className="font-bold">{t('analytics.periodComparison')}</h2>
          </div>
          <dl className="divide-y divide-line px-5">
            <div className="flex items-center justify-between gap-4 py-4">
              <div><dt className="text-sm font-medium">{t('analytics.thisWeek')}</dt><dd className="mt-1 text-xs text-muted-foreground">{weekChange === null ? t('analytics.noComparison') : t('analytics.change', { value: Math.abs(weekChange) })}</dd></div>
              <dd className="text-right"><p className="font-bold">{formatRsd(analytics.summary.thisWeekAmount)}</p>{weekChange !== null ? <p className={weekChange >= 0 ? 'mt-1 text-xs text-emerald-300' : 'mt-1 text-xs text-red-300'}>{weekChange >= 0 ? '+' : '-'}{Math.abs(weekChange)}%</p> : null}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div><dt className="text-sm font-medium">{t('analytics.lastWeek')}</dt><dd className="mt-1 text-xs text-muted-foreground">{t('analytics.completedRevenue')}</dd></div>
              <dd className="font-bold">{formatRsd(analytics.summary.lastWeekAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div><dt className="text-sm font-medium">{t('analytics.thisMonth')}</dt><dd className="mt-1 text-xs text-muted-foreground">{monthChange === null ? t('analytics.noComparison') : t('analytics.change', { value: Math.abs(monthChange) })}</dd></div>
              <dd className="text-right"><p className="font-bold">{formatRsd(analytics.summary.thisMonthAmount)}</p>{monthChange !== null ? <p className={monthChange >= 0 ? 'mt-1 text-xs text-emerald-300' : 'mt-1 text-xs text-red-300'}>{monthChange >= 0 ? '+' : '-'}{Math.abs(monthChange)}%</p> : null}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div><dt className="text-sm font-medium">{t('analytics.lastMonth')}</dt><dd className="mt-1 text-xs text-muted-foreground">{t('analytics.completedRevenue')}</dd></div>
              <dd className="font-bold">{formatRsd(analytics.summary.lastMonthAmount)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4"><ClipboardList className="size-4 text-action" /><h2 className="font-bold">{t('analytics.recentRestaurantOrders')}</h2></div>
        <DataTable
          columns={[
            { key: 'order', header: t('dashboard.order'), render: (order) => <Link className="font-bold text-content hover:text-action" to={`/orders/${order.id}`}>#{order.id}</Link> },
            { key: 'customer', header: t('orders.customer'), render: (order) => <div><p className="font-medium">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.customerEmail}</p></div> },
            { key: 'status', header: t('common.status'), render: (order) => <StatusBadge tone={order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'warning'}>{readableStatus(order.status)}</StatusBadge> },
            { key: 'subtotal', header: t('orders.subtotal'), render: (order) => <span className="font-bold">{formatRsd(order.subtotal)}</span> },
          ]}
          emptyTitle={t('dashboard.noOrders')}
          getRowKey={(order) => order.id}
          rows={analytics.recentOrders}
        />
      </section>
    </div>
  )
}
