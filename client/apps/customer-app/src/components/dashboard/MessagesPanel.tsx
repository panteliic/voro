import { useEffect, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrder, CustomerOrderStatus } from '../../types/customer'
import { OrderChatModal } from './OrderChatModal'

const messageableStatuses = new Set<CustomerOrderStatus>([
  'pending',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
])

function requestedOrderId(value: string | null) {
  const orderId = Number(value)
  return Number.isInteger(orderId) && orderId > 0 ? orderId : null
}

export function MessagesPanel() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(() =>
    requestedOrderId(searchParams.get('orderId')),
  )

  useEffect(() => {
    setSelectedOrderId(requestedOrderId(searchParams.get('orderId')))
  }, [searchParams])

  useEffect(() => {
    let active = true
    const load = () =>
      void customerApi
        .getOrders()
        .then(({ orders: nextOrders }) => {
          if (!active) return
          setOrders(nextOrders.filter((order) => messageableStatuses.has(order.status)))
          setError('')
        })
        .catch((requestError: unknown) => {
          if (active)
            setError(requestError instanceof Error ? requestError.message : t('messages.loadError'))
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })

    load()
    window.addEventListener('voro:customer-order-change', load)
    return () => {
      active = false
      window.removeEventListener('voro:customer-order-change', load)
    }
  }, [t])

  return (
    <section className="mx-auto grid max-w-3xl gap-5 pb-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">
          {t('messages.kicker')}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-content">{t('messages.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('messages.description')}</p>
      </header>

      {error ? (
        <p className="rounded-voro-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <div className="rounded-voro-xl border border-line bg-card p-10 text-center text-sm text-muted-foreground">
          {t('messages.loading')}
        </div>
      ) : null}
      {!isLoading && !error && orders.length === 0 ? (
        <div className="rounded-voro-xl border border-dashed border-line bg-card p-10 text-center">
          <MessageCircle className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-bold text-content">{t('messages.emptyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('messages.emptyDesc')}</p>
        </div>
      ) : null}
      {!isLoading && orders.length > 0 ? (
        <div className="grid gap-3">
          {orders.map((order) => {
            const courierAssigned = Boolean(order.driverName)
            return (
              <article
                className="flex flex-wrap items-center gap-3 rounded-voro-xl border border-line bg-card p-4"
                key={order.id}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-voro-md bg-accent text-action">
                  <MessageCircle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-content">{order.restaurantName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t('messages.order', { id: order.id })} ·{' '}
                    {courierAssigned
                      ? t('messages.courier', { name: order.driverName })
                      : t('messages.waitingForCourier')}
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-voro-md bg-action px-3 py-2 text-sm font-bold text-action-text disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!courierAssigned}
                  onClick={() => setSelectedOrderId(order.id)}
                  title={courierAssigned ? undefined : t('messages.waitingForCourier')}
                  type="button"
                >
                  <Send className="size-4" />
                  {t('messages.open')}
                </button>
              </article>
            )
          })}
        </div>
      ) : null}

      {selectedOrderId ? (
        <OrderChatModal onClose={() => setSelectedOrderId(null)} orderId={selectedOrderId} />
      ) : null}
    </section>
  )
}
