import { Button } from '@voro/ui'
import { Bike, Clock3, MapPin, ReceiptText } from 'lucide-react'
import { demoOrders } from '../../data/demoOrders'
import { useI18n } from '../../i18n/i18n'
import type { RestaurantOrder } from '../../types/restaurant'

const activeOrders = demoOrders.filter((order) =>
  ['New', 'Preparing', 'Ready'].includes(order.status),
)

const statusClassName: Record<RestaurantOrder['status'], string> = {
  New: 'bg-red-50 text-action',
  Preparing: 'bg-amber-50 text-amber-700',
  Ready: 'bg-emerald-50 text-emerald-700',
  Delivered: 'bg-muted text-muted-foreground',
  Cancelled: 'bg-muted text-muted-foreground',
}

const statusActionKey: Record<RestaurantOrder['status'], string> = {
  New: 'orders.accept',
  Preparing: 'orders.markReady',
  Ready: 'orders.handedOff',
  Delivered: 'status.Delivered',
  Cancelled: 'status.Cancelled',
}

export function OrdersBoard() {
  const { t } = useI18n()

  return (
    <section className="grid gap-4">
      <div className="flex flex-col justify-between gap-3 rounded-voro-lg border border-line bg-card p-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold">{t('orders.activeTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('orders.activeDesc')}
          </p>
        </div>
        <div className="rounded-voro-md bg-muted px-3 py-2 text-sm font-bold">
          {t('orders.liveCount', { count: activeOrders.length })}
        </div>
      </div>

      <div className="grid gap-3">
        {activeOrders.map((order) => (
          <article
            className="grid gap-4 rounded-voro-lg border border-line bg-card p-4 xl:grid-cols-[1.1fr_0.8fr_auto]"
            key={order.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-voro-md bg-content px-3 py-1 text-xs font-bold text-card">
                  {t('common.order').toUpperCase()} {order.id}
                </span>
                <span
                  className={`rounded-voro-md px-3 py-1 text-xs font-bold ${statusClassName[order.status]}`}
                >
                  {t(`status.${order.status}`)}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold">{order.customer}</h2>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4" />
                  {order.eta}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  {order.address}
                </span>
                <span className="flex items-center gap-2">
                  <Bike className="size-4" />
                  {order.driver || t('orders.waitingDriver')}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <ReceiptText className="size-4" />
                {t('common.items')}
              </p>
              {order.items.map((item) => (
                <p className="rounded-voro-md bg-muted px-3 py-2 text-sm font-medium" key={item}>
                  {item}
                </p>
              ))}
              <p className="pt-1 font-bold">{order.total}</p>
            </div>

            <div className="grid gap-3 rounded-voro-lg border border-dashed border-line bg-background p-4 text-center xl:min-w-44">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('orders.pickupCode')}</p>
                <p className="mt-1 text-4xl font-bold tracking-normal">{order.pickupCode}</p>
              </div>
              <Button size="sm" type="button">
                {t(statusActionKey[order.status])}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
