import { Bike, Clock3, MapPin, ReceiptText } from 'lucide-react'
import { useI18n } from '../../i18n/i18n'
import type { RestaurantOrder } from '../../types/restaurant'

type OrdersBoardProps = {
  orders: RestaurantOrder[]
  isUpdatingOrderId: number | null
  onUpdateOrderStatus: (orderId: number, status: RestaurantOrder['status']) => Promise<void>
}

const activeStatuses = new Set<RestaurantOrder['status']>([
  'pending',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
])

const statusClassName: Record<RestaurantOrder['status'], string> = {
  pending: 'bg-action/15 text-action',
  accepted: 'bg-sky-500/15 text-sky-500',
  preparing: 'bg-amber-500/15 text-amber-600',
  ready: 'bg-emerald-500/15 text-emerald-500',
  picked_up: 'bg-violet-500/15 text-violet-500',
  delivered: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
}

const nextStatusAction: Partial<
  Record<RestaurantOrder['status'], { status: RestaurantOrder['status']; label: string }>
> = {
  pending: { status: 'accepted', label: 'orders.accept' },
  accepted: { status: 'preparing', label: 'orders.startPreparing' },
  preparing: { status: 'ready', label: 'orders.markReady' },
}

const cancellationAction: Partial<
  Record<RestaurantOrder['status'], { label: string; confirmation: string }>
> = {
  pending: { label: 'orders.reject', confirmation: 'orders.confirmReject' },
  accepted: { label: 'orders.cancel', confirmation: 'orders.confirmCancel' },
  preparing: { label: 'orders.cancel', confirmation: 'orders.confirmCancel' },
}

export function OrdersBoard({ isUpdatingOrderId, onUpdateOrderStatus, orders }: OrdersBoardProps) {
  const { locale, t } = useI18n()
  const activeOrders = orders.filter((order) => activeStatuses.has(order.status))
  const money = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })

  return (
    <section className="grid gap-4">
      <div className="flex flex-col justify-between gap-3 rounded-voro-lg border border-line bg-card p-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold">{t('orders.activeTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('orders.activeDesc')}</p>
        </div>
        <div className="rounded-voro-md bg-muted px-3 py-2 text-sm font-bold">
          {t('orders.liveCount', { count: activeOrders.length })}
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="rounded-voro-lg border border-dashed border-line bg-card px-5 py-12 text-center">
          <ReceiptText className="mx-auto size-6 text-action" />
          <p className="mt-3 font-bold">{t('orders.empty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('orders.emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {activeOrders.map((order) => {
            const action = nextStatusAction[order.status]
            const cancellation = cancellationAction[order.status]

            return (
              <article
              className="grid gap-4 rounded-voro-lg border border-line bg-card p-4 xl:grid-cols-[1.1fr_0.8fr_auto]"
              key={order.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-voro-md bg-content px-3 py-1 text-xs font-bold text-card">
                    {t('common.order').toUpperCase()} #{order.id}
                  </span>
                  <span className={`rounded-voro-md px-3 py-1 text-xs font-bold ${statusClassName[order.status]}`}>
                    {t(`status.${order.status}`)}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold">{order.customerName}</h2>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Clock3 className="size-4" />
                    {t('orders.receivedAt', { time: time.format(new Date(order.createdAt)) })}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {order.address || t('orders.noAddress')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Bike className="size-4" />
                    {order.driverName
                      ? t('orders.driverAssigned', { name: order.driverName })
                      : order.status === 'accepted' || order.status === 'preparing'
                        ? t('orders.findingDriver')
                        : t('orders.waitingDriver')}
                  </span>
                  {order.driverName && order.pickupCode ? (
                    <span className="flex items-center gap-2 rounded-voro-md bg-content px-3 py-2 font-bold text-card">
                      {t('orders.pickupCode')}: <strong className="tracking-[0.12em]">#{order.id}</strong>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2">
                <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <ReceiptText className="size-4" />
                  {t('common.items')}
                </p>
                {order.items.map((item, index) => (
                  <p className="rounded-voro-md bg-muted px-3 py-2 text-sm font-medium" key={`${item.name}-${index}`}>
                    {item.name} × {item.quantity}
                  </p>
                ))}
                {order.note ? (
                  <p className="rounded-voro-md border border-dashed border-line px-3 py-2 text-sm text-muted-foreground">
                    {order.note}
                  </p>
                ) : null}
              </div>

              <div className="grid content-center gap-3 rounded-voro-lg border border-dashed border-line bg-background p-4 text-center xl:min-w-44">
                {action ? (
                  <>
                    <button
                      className="rounded-voro-md bg-action px-3 py-2 text-sm font-bold text-action-text transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isUpdatingOrderId === order.id}
                      onClick={() => {
                        void onUpdateOrderStatus(order.id, action.status)
                      }}
                      type="button"
                    >
                      {isUpdatingOrderId === order.id
                        ? t('orders.updating')
                        : t(action.label)}
                    </button>
                    {cancellation ? (
                      <button
                        className="rounded-voro-md border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUpdatingOrderId === order.id}
                        onClick={() => {
                          if (window.confirm(t(cancellation.confirmation))) {
                            void onUpdateOrderStatus(order.id, 'cancelled')
                          }
                        }}
                        type="button"
                      >
                        {isUpdatingOrderId === order.id
                          ? t('orders.updating')
                          : t(cancellation.label)}
                      </button>
                    ) : null}
                  </>
                ) : order.status === 'ready' ? (
                  <p className="text-sm font-bold text-muted-foreground">{t('orders.waitingDriver')}</p>
                ) : order.status === 'picked_up' ? (
                  <p className="text-sm font-bold text-muted-foreground">{t('orders.handedOff')}</p>
                ) : null}
                <p className="text-xs font-bold text-muted-foreground">{t('common.total')}</p>
                <p className="text-2xl font-bold">{money.format(order.total)} RSD</p>
                <p className="text-xs text-muted-foreground">{t('orders.deliveryIncluded')}</p>
              </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
