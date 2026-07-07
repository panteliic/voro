import { useEffect, useState } from 'react'
import { Bike, ClipboardList, Store, Users } from 'lucide-react'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { StatCard } from '../components/dashboard/StatCard'
import { useI18n } from '../i18n/i18n'
import { getOverview } from '../services/adminApi'
import type { AdminOverview } from '../types/admin'

export function DashboardPage() {
  const { t } = useI18n()
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
    return <p className="rounded-voro-lg border border-line bg-card p-4 text-sm font-bold text-red-700">{error}</p>
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.desc')}</p>
      </div>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={t('dashboard.users')} value={overview.stats.users} />
        <StatCard
          helper={t('dashboard.active', { count: overview.stats.activeRestaurants })}
          icon={Store}
          label={t('dashboard.restaurants')}
          value={overview.stats.restaurants}
        />
        <StatCard
          helper={t('dashboard.available', { count: overview.stats.availableDrivers })}
          icon={Bike}
          label={t('dashboard.drivers')}
          value={overview.stats.drivers}
        />
        <StatCard
          helper={t('dashboard.active', { count: overview.stats.activeOrders })}
          icon={ClipboardList}
          label={t('dashboard.orders')}
          value={overview.stats.orders}
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="grid gap-3">
          <h2 className="text-lg font-bold">{t('dashboard.recentUsers')}</h2>
          <DataTable
            columns={[
              { key: 'name', header: t('dashboard.user'), render: (user) => <div><p className="font-bold">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div> },
              { key: 'role', header: t('common.role'), render: (user) => <StatusBadge>{user.role}</StatusBadge> },
              { key: 'status', header: t('common.status'), render: (user) => <StatusBadge tone={user.isActive ? 'success' : 'danger'}>{user.isActive ? t('common.active') : t('common.blocked')}</StatusBadge> },
            ]}
            emptyTitle={t('dashboard.noUsers')}
            getRowKey={(user) => user.id}
            rows={overview.recentUsers}
          />
        </div>
        <div className="grid gap-3">
          <h2 className="text-lg font-bold">{t('dashboard.recentOrders')}</h2>
          <DataTable
            columns={[
              { key: 'id', header: t('dashboard.order'), render: (order) => <span className="font-bold">#{order.id}</span> },
              { key: 'restaurant', header: t('dashboard.restaurant'), render: (order) => order.restaurantName },
              { key: 'status', header: t('common.status'), render: (order) => <StatusBadge>{order.status}</StatusBadge> },
              { key: 'total', header: t('dashboard.total'), render: (order) => `$${order.total.toFixed(2)}` },
            ]}
            emptyTitle={t('dashboard.noOrders')}
            getRowKey={(order) => order.id}
            rows={overview.recentOrders}
          />
        </div>
      </section>
    </div>
  )
}
