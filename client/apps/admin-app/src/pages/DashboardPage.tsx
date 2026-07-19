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

function formatChartDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

function humanizeStatus(status: string) {
  return status.replace(/_/g, ' ')
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    accepted: '#38bdf8',
    preparing: '#a78bfa',
    ready: '#2dd4bf',
    picked_up: '#fb7185',
    delivered: '#34d399',
    cancelled: '#f87171',
  }

  return colors[status] || '#94a3b8'
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
  const [hoveredChartDay, setHoveredChartDay] = useState<string | null>(null)
  const [hoveredRevenueDay, setHoveredRevenueDay] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

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
  const averageDailyVolume = Math.round(totalWeeklyOrders / Math.max(overview.orderVolume.length, 1))
  const totalWeeklyRevenue = overview.revenueVolume.reduce((total, day) => total + day.revenue, 0)
  const largestDailyRevenue = Math.max(...overview.revenueVolume.map((day) => day.revenue), 1)
  const revenuePoints = overview.revenueVolume.map((day, index) => {
    const x = (index / Math.max(overview.revenueVolume.length - 1, 1)) * 100
    const y = 92 - (day.revenue / largestDailyRevenue) * 76
    return { ...day, x, y }
  })
  const visibleStatuses = overview.orderStatusDistribution.filter((status) => status.orders > 0)
  const totalStatusOrders = visibleStatuses.reduce((total, status) => total + status.orders, 0)
  let donutProgress = 0
  const donutGradient = visibleStatuses.length
    ? `conic-gradient(${visibleStatuses
        .map((status) => {
          const start = donutProgress
          donutProgress += (status.orders / Math.max(totalStatusOrders, 1)) * 100
          return `${statusColor(status.status)} ${start}% ${donutProgress}%`
        })
        .join(', ')})`
    : 'conic-gradient(#334155 0% 100%)'
  const activeStatus = visibleStatuses.find((status) => status.status === selectedStatus) || null
  const activeRevenue = revenuePoints.find((day) => day.date === hoveredRevenueDay) || null

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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard helper={t('dashboard.usersHelper', { count: overview.stats.users })} icon={Users} label={t('dashboard.users')} value={overview.stats.users} />
        <StatCard helper={t('dashboard.active', { count: overview.stats.activeOrders })} icon={ClipboardList} label={t('dashboard.orders')} value={overview.stats.orders} />
        <StatCard helper={t('dashboard.active', { count: overview.stats.activeRestaurants })} icon={Store} label={t('dashboard.restaurants')} value={overview.stats.restaurants} />
        <StatCard helper={t('dashboard.available', { count: overview.stats.availableDrivers })} icon={Bike} label={t('dashboard.drivers')} value={overview.stats.drivers} />
        <StatCard
          helper={t('dashboard.averagePerDay', { count: averageDailyVolume })}
          icon={TrendingUp}
          label={t('dashboard.weeklyOrders')}
          value={totalWeeklyOrders}
        />
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
              const isHovered = hoveredChartDay === day.date

              return (
                <div className="group relative flex h-full min-w-0 flex-1 items-end" key={day.date}>
                  <div
                    aria-label={t('dashboard.ordersOnDay', { day: formatChartDate(day.date, language), count: day.orders })}
                    className="w-full cursor-default rounded-t-md border border-white/10 bg-gradient-to-t from-action/35 to-action/80 transition-[opacity,transform] group-hover:opacity-100 group-hover:scale-y-[1.02]"
                    onBlur={() => setHoveredChartDay(null)}
                    onFocus={() => setHoveredChartDay(day.date)}
                    onMouseEnter={() => setHoveredChartDay(day.date)}
                    onMouseLeave={() => setHoveredChartDay(null)}
                    role="img"
                    style={{ height: `${height}%` }}
                    tabIndex={0}
                    title={`${formatChartDay(day.date, language)}: ${day.orders}`}
                  />
                  {isHovered ? (
                    <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 w-max -translate-x-1/2 rounded-voro-md border border-line bg-card px-2.5 py-2 text-center shadow-xl">
                      <p className="text-[10px] font-medium text-muted-foreground">{formatChartDate(day.date, language)}</p>
                      <p className="mt-0.5 text-sm font-bold text-content">{t('dashboard.orderCount', { count: day.orders })}</p>
                    </div>
                  ) : null}
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {formatChartDay(day.date, language)}
                  </span>
                </div>
              )
            })}
          </div>
        </article>

        <article className="admin-panel overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-action" />
                <h2 className="font-bold">{t('dashboard.statusDistribution')}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.statusDistributionCaption')}</p>
            </div>
            <span className="rounded-voro-md border border-line bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t('dashboard.last7Days')}</span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[8.25rem_1fr] sm:items-center">
            <div
              aria-label={t('dashboard.statusDistribution')}
              className="relative mx-auto grid size-32 place-items-center rounded-full"
              role="img"
              style={{ background: donutGradient }}
              title={activeStatus ? `${humanizeStatus(activeStatus.status)}: ${activeStatus.orders}` : t('dashboard.statusDistribution')}
            >
              <div className="grid size-20 place-items-center rounded-full border border-line bg-card text-center shadow-inner">
                <strong className="text-xl leading-none text-content">{activeStatus?.orders || totalStatusOrders}</strong>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {activeStatus
                    ? `${Math.round((activeStatus.orders / Math.max(totalStatusOrders, 1)) * 100)}%`
                    : t('dashboard.orders')}
                </span>
              </div>
            </div>
            <div className="grid gap-1.5">
              {visibleStatuses.map((status) => {
                const isSelected = activeStatus?.status === status.status
                const percentage = Math.round((status.orders / Math.max(totalStatusOrders, 1)) * 100)

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between gap-2 rounded-voro-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected ? 'bg-muted text-content' : 'text-muted-foreground hover:bg-muted/70 hover:text-content'
                    }`}
                    key={status.status}
                    onBlur={() => setSelectedStatus(null)}
                    onFocus={() => setSelectedStatus(status.status)}
                    onMouseEnter={() => setSelectedStatus(status.status)}
                    onMouseLeave={() => setSelectedStatus(null)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor(status.status) }} />
                      <span className="truncate capitalize">{humanizeStatus(status.status)}</span>
                    </span>
                    <span className="shrink-0 font-bold text-content">{status.orders} · {percentage}%</span>
                  </button>
                )
              })}
              {!visibleStatuses.length ? <p className="text-sm text-muted-foreground">{t('dashboard.noOrders')}</p> : null}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="admin-panel overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-action" />
                <h2 className="font-bold">{t('dashboard.revenueTrend')}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.revenueCaption', { amount: formatRsd(totalWeeklyRevenue) })}</p>
            </div>
            <span className="rounded-voro-md border border-line bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t('dashboard.last7Days')}</span>
          </div>
          <div className="relative mx-5 mt-5 h-56 border-b border-line pb-7">
            <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-line/80" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line/80" />
            <div className="absolute inset-x-0 bottom-7 border-t border-line" />
            <svg aria-hidden="true" className="absolute inset-x-0 top-0 h-[calc(100%-1.75rem)] w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(45 212 191)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(45 212 191)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon fill="url(#revenue-fill)" points={`0,100 ${revenuePoints.map((point) => `${point.x},${point.y}`).join(' ')} 100,100`} />
              <polyline fill="none" points={revenuePoints.map((point) => `${point.x},${point.y}`).join(' ')} stroke="rgb(45 212 191)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              {revenuePoints.map((point) => (
                <circle cx={point.x} cy={point.y} fill="rgb(15 23 42)" key={point.date} r="2.2" stroke="rgb(45 212 191)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            <div className="absolute inset-x-0 top-0 flex h-[calc(100%-1.75rem)]">
              {revenuePoints.map((point) => (
                <button
                  aria-label={t('dashboard.revenueOnDay', { day: formatChartDate(point.date, language), amount: formatRsd(point.revenue) })}
                  className="flex-1 cursor-default focus:outline-none"
                  key={point.date}
                  onBlur={() => setHoveredRevenueDay(null)}
                  onFocus={() => setHoveredRevenueDay(point.date)}
                  onMouseEnter={() => setHoveredRevenueDay(point.date)}
                  onMouseLeave={() => setHoveredRevenueDay(null)}
                  type="button"
                />
              ))}
            </div>
            {activeRevenue ? (
              <div className="pointer-events-none absolute bottom-9 z-10 w-max -translate-x-1/2 rounded-voro-md border border-line bg-card px-2.5 py-2 text-center shadow-xl" style={{ left: `${activeRevenue.x}%` }}>
                <p className="text-[10px] font-medium text-muted-foreground">{formatChartDate(activeRevenue.date, language)}</p>
                <p className="mt-0.5 text-sm font-bold text-content">{formatRsd(activeRevenue.revenue)}</p>
              </div>
            ) : null}
            <div className="absolute inset-x-0 -bottom-0.5 flex justify-between">
              {revenuePoints.map((point) => (
                <span className="text-[10px] font-medium text-muted-foreground sm:text-xs" key={point.date}>{formatChartDay(point.date, language)}</span>
              ))}
            </div>
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
