import { DriverStats } from '../components/dashboard/DriverStats'
import { DeliveriesList } from '../components/deliveries/DeliveriesList'
import { AppHeader } from '../components/layout/AppHeader'
import type { AuthUser } from '../types/auth'
import type { DashboardResponse } from '../types/driver'

type DashboardPageProps = {
  dashboard: DashboardResponse | null
  user: AuthUser
  status: string
  isLoading: boolean
  onRefresh: () => void
  onLogout: () => void
}

export function DashboardPage({
  dashboard,
  isLoading,
  onLogout,
  onRefresh,
  status,
  user,
}: DashboardPageProps) {
  return (
    <main className="min-h-screen bg-background text-content">
      <AppHeader
        dashboard={dashboard}
        isLoading={isLoading}
        onLogout={onLogout}
        onRefresh={onRefresh}
        user={user}
      />

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5">
        {status ? (
          <p className="rounded-voro-lg border border-line bg-card px-4 py-3 text-sm font-medium">
            {status}
          </p>
        ) : null}

        <DriverStats dashboard={dashboard} />
        <DeliveriesList deliveries={dashboard?.deliveries || []} />
      </div>
    </main>
  )
}
