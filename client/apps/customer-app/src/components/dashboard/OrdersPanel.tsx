import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Clock3, PackageCheck, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrder, CustomerOrderStatus } from '../../types/customer'
import { OrderRouteMap } from './OrderRouteMap'

const activeStatuses = new Set<CustomerOrderStatus>([
  'pending',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
])

const statusClassName: Record<CustomerOrderStatus, string> = {
  pending: 'bg-action/15 text-action',
  accepted: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  preparing: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ready: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  picked_up: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  delivered: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

function HistoryOrderCard({ order }: { order: CustomerOrder }) {
  const { language, t } = useI18n()
  const money = useMemo(
    () => new Intl.NumberFormat(language === 'sr' ? 'sr-RS' : 'en-US', { maximumFractionDigits: 0 }),
    [language],
  )
  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'sr' ? 'sr-RS' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language],
  )

  return (
    <article className="rounded-voro-xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-voro-md bg-content px-2.5 py-1 text-xs font-bold text-card">
              #{order.id}
            </span>
            <span className={`rounded-voro-md px-2.5 py-1 text-xs font-bold ${statusClassName[order.status]}`}>
              {t(`orders.status.${order.status}`)}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-content">{order.restaurantName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('orders.total')}</p>
          <p className="mt-1 text-xl font-bold text-content">{money.format(order.total)} RSD</p>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-muted-foreground">
        <Clock3 className="size-4" />{t('orders.placedAt', { time: dateTime.format(new Date(order.createdAt)) })}
      </p>
    </article>
  )
}

export function OrdersPanel() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'active' | 'history'>('active')

  useEffect(() => {
    let isMounted = true

    function updateOrders(nextOrders: CustomerOrder[]) {
      if (isMounted) {
        setOrders(nextOrders)
        setError('')
      }
    }

    customerApi
      .getOrders()
      .then(({ orders: nextOrders }) => updateOrders(nextOrders))
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('orders.loadError'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    const refreshInterval = window.setInterval(() => {
      customerApi.getOrders().then(({ orders: nextOrders }) => updateOrders(nextOrders)).catch(() => {})
    }, 3_000)

    return () => {
      isMounted = false
      window.clearInterval(refreshInterval)
    }
  }, [t])

  const activeOrders = orders.filter((order) => activeStatuses.has(order.status))
  const previousOrders = orders.filter((order) => !activeStatuses.has(order.status))
  const visibleOrders = tab === 'active' ? activeOrders : previousOrders
  const isSingleActiveOrder = tab === 'active' && activeOrders.length === 1

  if (isLoading) {
    return (
      <section className="grid min-h-[24rem] place-items-center rounded-voro-xl border border-line bg-card px-5 text-sm font-medium text-muted-foreground">
        {t('orders.loading')}
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-voro-xl border border-destructive/30 bg-destructive/10 p-5 text-sm font-medium text-destructive">
        {error}
      </section>
    )
  }

  if (orders.length > 0) {
    return (
      <section className={isSingleActiveOrder ? 'flex h-full min-h-0 flex-col' : 'grid gap-5 pb-8'}>
        <div className={isSingleActiveOrder ? 'mb-5 shrink-0' : ''}>
          <h1 className="text-2xl font-bold text-content">{t('nav.orders')}</h1>
        </div>

        <div className={`-mx-4 grid grid-cols-2 border-y border-line sm:-mx-6 lg:-mx-8 ${isSingleActiveOrder ? 'mb-5 shrink-0' : ''}`} role="tablist" aria-label={t('orders.title')}>
          <button aria-selected={tab === 'active'} className={`relative flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold transition-colors after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 ${tab === 'active' ? 'text-action after:bg-action' : 'text-muted-foreground after:bg-transparent hover:text-content'}`} onClick={() => setTab('active')} role="tab" type="button"><PackageCheck className="size-4" />{t('orders.active')} ({activeOrders.length})</button>
          <button aria-selected={tab === 'history'} className={`relative flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold transition-colors after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 ${tab === 'history' ? 'text-action after:bg-action' : 'text-muted-foreground after:bg-transparent hover:text-content'}`} onClick={() => setTab('history')} role="tab" type="button"><ClipboardList className="size-4" />{t('orders.history')} ({previousOrders.length})</button>
        </div>

        {visibleOrders.length > 0 ? <div className={isSingleActiveOrder ? 'min-h-0 flex-1' : tab === 'active' ? 'grid gap-4 pb-3 xl:grid-cols-2' : 'grid gap-3'}>
          {tab === 'active'
            ? activeOrders.map((order) => (
                <OrderRouteMap
                  estimatedDeliveryRange={order.estimatedDeliveryRange}
                  fillAvailableHeight={isSingleActiveOrder}
                  key={order.id}
                  orderId={order.id}
                />
              ))
            : previousOrders.map((order) => <HistoryOrderCard key={order.id} order={order} />)}
        </div> : <div className="rounded-voro-xl border border-dashed border-line bg-card px-5 py-10 text-center text-sm font-medium text-muted-foreground">
          {tab === 'active' ? t('orders.noActive') : t('orders.noHistory')}
        </div>}
      </section>
    )
  }

  return (
    <section className="grid min-h-[24rem] place-items-center rounded-voro-xl border border-dashed border-line bg-card px-5 py-10 text-center sm:px-8">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-voro-lg bg-accent text-action">
          <ClipboardList className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-content">{t('orders.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('orders.empty')}</p>
        <NavLink
          className="mt-6 inline-flex items-center gap-2 rounded-voro-lg bg-action px-4 py-2.5 text-sm font-bold text-action-text transition hover:bg-action-hover"
          to="/"
        >
          <Search className="size-4" />
          {t('orders.browse')}
        </NavLink>
      </div>
    </section>
  )
}
