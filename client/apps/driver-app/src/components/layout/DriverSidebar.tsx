import type { LucideIcon } from 'lucide-react'

export type DriverView = 'home' | 'history' | 'settings'

type DriverSidebarProps = {
  driverName: string
  email: string
  navItems: Array<{ id: DriverView; label: string; icon: LucideIcon }>
  onViewChange: (view: DriverView) => void
  vehicleType: string
  workspaceLabel: string
  view: DriverView
}

export function DriverSidebar({
  driverName,
  email,
  navItems,
  onViewChange,
  vehicleType,
  workspaceLabel,
  view,
}: DriverSidebarProps) {
  return (
    <aside className="hidden border-b border-line bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-[4.25rem] items-center gap-3 border-b border-line px-5">
        <img src="/logo.svg" alt="Voro" className="size-8 shrink-0 rounded-voro-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">{driverName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{workspaceLabel}</p>
        </div>
      </div>

      <nav className="grid gap-1 px-3 pb-3 pt-5">
        {navItems.map(({ icon: Icon, id, label }) => (
          <button
            className={`flex min-h-10 items-center gap-3 rounded-voro-md px-3 text-left text-sm font-bold transition-colors ${
              view === id ? 'bg-accent text-content shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-content'
            }`}
            key={id}
            onClick={() => onViewChange(id)}
            type="button"
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <div className="flex items-center gap-3 rounded-voro-md bg-muted/70 p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action text-xs font-bold text-white">
            {driverName.slice(0, 1).toUpperCase() || 'D'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-content">{driverName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{vehicleType || email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
