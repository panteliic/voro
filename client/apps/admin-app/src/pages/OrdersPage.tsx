import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@voro/ui'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { useI18n } from '../i18n/i18n'
import { listOrders } from '../services/ordersApi'
import type { Order } from '../types/order'
import { formatRsd } from '../utils/currency'

const statusOptions = ['all', 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']

export function OrdersPage() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState('all')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listOrders(status === 'all' ? '' : status)

        if (isMounted) {
          setOrders(result.orders)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('orders.error'))
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
  }, [status, t])

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('orders.desc')}</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {isLoading ? (
        <LoadingState label={t('orders.loading')} />
      ) : (
        <DataTable
          columns={[
            {
              key: 'order',
              header: t('dashboard.order'),
              render: (order) => (
                <Link className="font-bold text-action" to={`/orders/${order.id}`}>
                  #{order.id}
                </Link>
              ),
            },
            {
              key: 'customer',
              header: t('orders.customer'),
              render: (order) => <div><p className="font-bold">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.customerEmail}</p></div>,
            },
            { key: 'restaurant', header: t('dashboard.restaurant'), render: (order) => order.restaurantName },
            { key: 'driver', header: t('orders.driver'), render: (order) => order.courierName || t('orders.unassigned') },
            { key: 'status', header: t('common.status'), render: (order) => <StatusBadge>{order.status}</StatusBadge> },
            { key: 'total', header: t('dashboard.total'), render: (order) => formatRsd(order.total) },
          ]}
          emptyTitle={t('orders.noOrders')}
          getRowKey={(order) => order.id}
          rows={orders}
        />
      )}
    </div>
  )
}
