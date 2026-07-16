import { useEffect, useState } from 'react'
import {
  Bike,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { StatCard } from '../components/dashboard/StatCard'
import { useAuth } from '../hooks/useAuth'
import { useI18n, type Language } from '../i18n/i18n'
import { getOverview } from '../services/adminApi'
import type { AdminOverview } from '../types/admin'
import { formatRsd } from '../utils/currency'

type Activity = {
  id: string
  title: string
  detail: string
  occurredAt: string
  Icon: LucideIcon
  iconClassName: string
}

function getLocale(language: Language) {
  return language === 'sr' ? 'sr-RS' : 'en-US'
}

function formatRelativeTime(value: string, language: Language) {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const minutes = Math.round((timestamp - Date.now()) / 60_000)
  const formatter = new Intl.RelativeTimeFormat(getLocale(language), { numeric: 'auto' })

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute')
  }

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour')
  }

  return formatter.format(Math.round(hours / 24), 'day')
}

function formatChartDay(value: string, language: Language) {
  return new Intl.DateTimeFormat(getLocale(language), { weekday: 'short' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '')
}

function humanizeStatus(status: string) {
  return status.replace(/_/g, ' ')
}

function activityTimestamp(activity: Activity) {
  const timestamp = new Date(activity.occurredAt).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function DashboardPage() {
  const { t, language } = useI18n()
  const { user } = useAuth()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadOverview() {
      try {
        const result = await getOverview()

        if (isMounted) {
          setOverview(result)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('dashboard.error'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isMounted = false
    }
  }, [t])

  if (isLoading) {
    return <LoadingState label={t('dashboard.loading')} />
  }

  if (error || !overview) {
    return <p className="rounded-voro-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</p>
  }

  const activities: Activity[] = [
    ...overview.recentOrders.map((order) => ({
      id: `order-${order.id}`,
      title: `${t('dashboard.order')} #${order.id}`,
      detail: `${order.restaurantName} · ${humanizeStatus(order.status)}`,
      occurredAt: order.createdAt,
      Icon: ClipboardList,
      iconClassName: 'bg-action/15 text-action',
    })),
    ...overview.recentUsers.map((recentUser) => ({
      id: `user-${recentUser.id}`,
      title: t('dashboard.activityUser', { name: recentUser.name }),
      detail: recentUser.email,
      occurredAt: recentUser.createdAt,
      Icon: UserPlus,
      iconClassName: 'bg-sky-500/15 text-sky-300',
    })),
    ...overview.recentRestaurants.map((restaurant) => ({
      id: `restaurant-${restaurant.id}`,
      title: t('dashboard.activityRestaurant', { name: restaurant.name }),
      detail: restaurant.categoryName || t('common.general'),
      occurredAt: restaurant.createdAt,
      Icon: Store,
      iconClassName: 'bg-emerald-500/15 text-emerald-300',
    })),
  ]
    .sort((first, second) => activityTimestamp(second) - activityTimestamp(first))
    .slice(0, 6)

  const totalWeeklyOrders = overview.orderVolume.reduce((total, day) => total + day.orders, 0)
  const largestDailyVolume = Math.max(...overview.orderVolume.map((day) => day.orders), 1)

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dashboard-eyebrow">{t('dashboard.workspace')}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('dashboard.welcome', { name: user?.name || 'Admin' })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.desc')}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-voro-md border border-line bg-card px-3 py-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 text-action" />
          {t('dashboard.liveData')}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard helper={t('dashboard.usersHelper', { count: overview.stats.users })} icon={Users} label={t('dashboard.users')} value={overview.stats.users} />
        <StatCard helper={t('dashboard.active', { count: overview.stats.activeOrders })} icon={ClipboardList} label={t('dashboard.orders')} value={overview.stats.orders} />
        <StatCard helper={t('dashboard.active', { count: overview.stats.activeRestaurants })} icon={Store} label={t('dashboard.restaurants')} value={overview.stats.restaurants} />
        <StatCard helper={t('dashboard.available', { count: overview.stats.availableDrivers })} icon={Bike} label={t('dashboard.drivers')} value={overview.stats.drivers} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="admin-panel overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-action" />
                <h2 className="font-bold">{t('dashboard.orderVolume')}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.volumeCaption', { count: totalWeeklyOrders })}</p>
            </div>
            <span className="rounded-voro-md border border-line bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {t('dashboard.last7Days')}
            </span>
          </div>
          <div className="dashboard-chart-grid mx-5 mt-5 flex h-56 items-end gap-2 border-b border-line pb-7 sm:gap-3">
            {overview.orderVolume.map((day) => {
              const height = Math.max(10, Math.round((day.orders / largestDailyVolume) * 100))

              return (
                <div className="group relative flex h-full min-w-0 flex-1 items-end" key={day.date}>
                  <div
                    aria-label={`${formatChartDay(day.date, language)}: ${day.orders}`}
                    className="w-full rounded-t-md border border-white/10 bg-gradient-to-t from-action/35 to-action/80 transition-opacity group-hover:opacity-100"
                    role="img"
                    style={{ height: `${height}%` }}
                    title={`${formatChartDay(day.date, language)}: ${day.orders}`}
                  />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {formatChartDay(day.date, language)}
                  </span>
                </div>
              )
            })}
          </div>
        </article>

        <article className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-action" />
              <h2 className="font-bold">{t('dashboard.activities')}</h2>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">LIVE</span>
          </div>
          {activities.length ? (
            <div className="divide-y divide-line px-5">
              {activities.map((activity) => {
                const Icon = activity.Icon

                return (
                  <div className="flex gap-3 py-3.5" key={activity.id}>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-voro-md ${activity.iconClassName}`}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-content">{activity.title}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{activity.detail}</p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">{formatRelativeTime(activity.occurredAt, language)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">{t('dashboard.noActivity')}</p>
          )}
        </article>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-action" />
            <h2 className="font-bold">{t('dashboard.recentOrders')}</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-xs font-bold text-action hover:text-content" to="/orders">
            {t('dashboard.viewAll')} <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <DataTable
          columns={[
            { key: 'id', header: t('dashboard.order'), render: (order) => <Link className="font-bold text-content hover:text-action" to={`/orders/${order.id}`}>#{order.id}</Link> },
            { key: 'restaurant', header: t('dashboard.restaurant'), render: (order) => <span className="font-medium">{order.restaurantName}</span> },
            { key: 'customer', header: t('orders.customer'), render: (order) => <div><p className="font-medium">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.customerEmail}</p></div> },
            { key: 'status', header: t('common.status'), render: (order) => <StatusBadge tone={order.status === 'cancelled' ? 'danger' : 'success'}>{humanizeStatus(order.status)}</StatusBadge> },
            { key: 'total', header: t('dashboard.total'), render: (order) => <span className="font-bold">{formatRsd(order.total)}</span> },
          ]}
          emptyTitle={t('dashboard.noOrders')}
          getRowKey={(order) => order.id}
          rows={overview.recentOrders}
        />
      </section>
    </div>
  )
}
