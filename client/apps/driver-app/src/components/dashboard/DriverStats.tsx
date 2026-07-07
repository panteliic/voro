import type { DashboardResponse } from '../../types/driver'

export function DriverStats({ dashboard }: { dashboard: DashboardResponse | null }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">Availability</p>
        <p className="mt-2 text-2xl font-bold">
          {dashboard?.driver.isAvailable ? 'Available' : 'Inactive'}
        </p>
      </article>
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">Vehicle</p>
        <p className="mt-2 text-2xl font-bold">
          {dashboard?.driver.vehicleType || 'Not set'}
        </p>
      </article>
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">Active deliveries</p>
        <p className="mt-2 text-2xl font-bold">{dashboard?.deliveries.length || 0}</p>
      </article>
    </section>
  )
}
