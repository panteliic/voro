import type { Delivery } from '../../types/driver'

export function DeliveriesList({ deliveries }: { deliveries: Delivery[] }) {
  return (
    <section className="rounded-voro-lg border border-line bg-card p-5">
      <h1 className="text-xl font-bold">Assigned deliveries</h1>
      <div className="mt-4 grid gap-3">
        {deliveries.map((delivery) => (
          <article
            className="grid gap-3 rounded-voro-md border border-line px-4 py-3 md:grid-cols-[1fr_auto]"
            key={delivery.id}
          >
            <div>
              <p className="font-bold">Order #{delivery.orderId}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {delivery.restaurantName} to {delivery.customerName}
              </p>
            </div>
            <div className="md:text-right">
              <p className="font-bold">{delivery.total.toFixed(2)} RSD</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">{delivery.status}</p>
            </div>
          </article>
        ))}
        {deliveries.length === 0 ? (
          <p className="rounded-voro-md border border-dashed border-line px-4 py-8 text-center text-sm font-bold text-muted-foreground">
            No assigned deliveries yet.
          </p>
        ) : null}
      </div>
    </section>
  )
}
