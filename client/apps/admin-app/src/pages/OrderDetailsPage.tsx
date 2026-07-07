import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@voro/ui'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { useI18n } from '../i18n/i18n'
import { getOrder } from '../services/ordersApi'
import type { Order } from '../types/order'

export function OrderDetailsPage() {
  const { t } = useI18n()
  const params = useParams()
  const orderId = Number(params.orderId)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const result = await getOrder(orderId)

        if (isMounted) {
          setOrder(result.order)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('orders.orderError'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [orderId, t])

  if (isLoading) {
    return <LoadingState label={t('orders.loadingOrder')} />
  }

  if (error || !order) {
    return <p className="rounded-voro-lg border border-line bg-card p-4 text-sm font-bold text-red-700">{error}</p>
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.order')} #{order.id}</h1>
          <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/orders">{t('orders.back')}</Link>
        </Button>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-voro-lg border border-line bg-card p-4">
          <h2 className="font-bold">{t('orders.customer')}</h2>
          <p className="mt-3 text-sm font-bold">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
        </article>
        <article className="rounded-voro-lg border border-line bg-card p-4">
          <h2 className="font-bold">{t('dashboard.restaurant')}</h2>
          <p className="mt-3 text-sm font-bold">{order.restaurantName}</p>
          <p className="text-sm text-muted-foreground">{t('dashboard.restaurant')} #{order.restaurantId}</p>
        </article>
        <article className="rounded-voro-lg border border-line bg-card p-4">
          <h2 className="font-bold">{t('orders.driver')}</h2>
          <p className="mt-3 text-sm font-bold">{order.courierName || t('orders.unassigned')}</p>
          <p className="text-sm text-muted-foreground">{order.courierId ? `${t('orders.driver')} #${order.courierId}` : t('orders.noCourier')}</p>
        </article>
      </section>
      <section className="rounded-voro-lg border border-line bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{order.status}</StatusBadge>
          {order.deliveryStatus ? <StatusBadge tone="warning">{order.deliveryStatus}</StatusBadge> : null}
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="font-bold text-muted-foreground">{t('orders.subtotal')}</dt><dd>${order.subtotal.toFixed(2)}</dd></div>
          <div><dt className="font-bold text-muted-foreground">{t('orders.deliveryFee')}</dt><dd>${order.deliveryFee.toFixed(2)}</dd></div>
          <div><dt className="font-bold text-muted-foreground">{t('dashboard.total')}</dt><dd className="font-bold">${order.total.toFixed(2)}</dd></div>
        </dl>
        {order.note ? <p className="mt-4 rounded-voro-md bg-muted p-3 text-sm">{order.note}</p> : null}
      </section>
    </div>
  )
}
