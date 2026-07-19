import { useEffect, useMemo, useState } from 'react'
import { Bike, ClipboardList, Clock3, MapPin, PackageCheck, ReceiptText, Search } from 'lucide-react'
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

function OrderCard({ order }: { order: CustomerOrder }) {
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-voro-md bg-content px-2.5 py-1 text-xs font-bold text-card">
              #{order.id}
            </span>
            <span className={`rounded-voro-md px-2.5 py-1 text-xs font-bold ${statusClassName[order.status]}`}>
              {t(`orders.status.${order.status}`)}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-bold text-content">{order.restaurantName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('orders.total')}</p>
          <p className="mt-1 text-xl font-bold text-content">{money.format(order.total)} RSD</p>
        </div>
      </div>

      {order.estimatedDeliveryRange ? (
        <div className="mt-4 flex items-center gap-3 rounded-voro-lg bg-accent px-3.5 py-3 text-sm text-content">
          <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-card text-action">
            <Clock3 className="size-4" />
          </span>
          <div>
            <p className="font-bold">{t('orders.estimatedDelivery')}</p>
            <p className="text-muted-foreground">
              {t('orders.estimatedRange', order.estimatedDeliveryRange)}
            </p>
          </div>
        </div>
      ) : null}

      {order.driverName ? (
        <div className="mt-3 flex items-center gap-3 rounded-voro-lg border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-sm text-content">
          <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-card text-emerald-600 dark:text-emerald-400">
            <Bike className="size-4" />
          </span>
          <div>
            <p className="font-bold">{t('orders.driverAssigned', { name: order.driverName })}</p>
            <p className="text-muted-foreground">{t('orders.driverAssignedHint')}</p>
          </div>
        </div>
      ) : order.status === 'preparing' ? (
        <div className="mt-3 flex items-center gap-3 rounded-voro-lg bg-accent px-3.5 py-3 text-sm text-content">
          <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-card text-action">
            <Bike className="size-4" />
          </span>
          <p className="font-bold">{t('orders.findingDriver')}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm text-muted-foreground sm:grid-cols-2">
        <span className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          {order.address || t('orders.noAddress')}
        </span>
        <span className="flex items-center gap-2 sm:justify-end">
          <ReceiptText className="size-4 shrink-0" />
          {t('orders.placedAt', { time: dateTime.format(new Date(order.createdAt)) })}
        </span>
      </div>

      {activeStatuses.has(order.status) ? <OrderRouteMap orderId={order.id} /> : null}
    </article>
  )
}

export function OrdersPanel() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
      <section className="grid gap-6 pb-8">
        <div>
          <p className="text-sm font-bold text-action">{t('orders.kicker')}</p>
          <h1 className="mt-1 text-2xl font-bold text-content">{t('orders.title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('orders.description')}</p>
        </div>

        {activeOrders.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-content">
              <PackageCheck className="size-4 text-action" />
              {t('orders.active')}
            </div>
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : null}

        {previousOrders.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-content">
              <ClipboardList className="size-4 text-muted-foreground" />
              {t('orders.history')}
            </div>
            {previousOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : null}
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
