import type { Delivery } from '../../types/driver'
import { translate, type DriverLanguage } from '../../i18n'

export function DeliveriesList({ deliveries }: { deliveries: Delivery[] }) {
  const language: DriverLanguage = localStorage.getItem('voro-driver-language') === 'en' ? 'en' : 'sr'
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  return (
    <section className="rounded-voro-lg border border-line bg-card p-5">
      <h1 className="text-xl font-bold">{t('deliveries.assigned')}</h1>
      <div className="mt-4 grid gap-3">
        {deliveries.map((delivery) => (
          <article
            className="grid gap-3 rounded-voro-md border border-line px-4 py-3 md:grid-cols-[1fr_auto]"
            key={delivery.id}
          >
            <div>
              <p className="font-bold">{t('deliveries.order', { id: delivery.orderId })}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {delivery.restaurantName} {t('deliveries.to')} {delivery.customerName}
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
            {t('deliveries.empty')}
          </p>
        ) : null}
      </div>
    </section>
  )
}
