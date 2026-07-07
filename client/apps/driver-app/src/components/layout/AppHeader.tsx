import { Button } from '@voro/ui'
import type { AuthUser } from '../../types/auth'
import type { DashboardResponse } from '../../types/driver'

type AppHeaderProps = {
  dashboard: DashboardResponse | null
  user: AuthUser
  isLoading: boolean
  onRefresh: () => void
  onLogout: () => void
}

export function AppHeader({
  dashboard,
  isLoading,
  onLogout,
  onRefresh,
  user,
}: AppHeaderProps) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="Voro" className="size-10 shrink-0 rounded-voro-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{dashboard?.driver.name || user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={isLoading} onClick={onRefresh} size="sm" type="button" variant="outline">
            Refresh
          </Button>
          <Button onClick={onLogout} size="sm" type="button" variant="outline">
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
