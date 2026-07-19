import type { DashboardResponse } from '../../types/driver'

export function DriverStats({ dashboard }: { dashboard: DashboardResponse | null }) {
  const driver = dashboard?.driver
  const location =
    driver?.currentLatitude !== null && driver?.currentLatitude !== undefined &&
    driver?.currentLongitude !== null && driver?.currentLongitude !== undefined
      ? `${driver.currentLatitude.toFixed(4)}, ${driver.currentLongitude.toFixed(4)}`
      : 'No current location'

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">Work status</p>
        <p className="mt-2 text-2xl font-bold">
          {driver?.isOnline ? 'Online' : 'Offline'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {driver?.isAvailable ? 'Ready for a new delivery' : 'Not available for matching'}
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
      <article className="rounded-voro-lg border border-line bg-card p-4">
        <p className="text-sm font-bold text-muted-foreground">Current test location</p>
        <p className="mt-2 text-base font-bold">{location}</p>
        <p className="mt-1 text-xs text-muted-foreground">Used to choose the closest driver</p>
      </article>
    </section>
  )
}
