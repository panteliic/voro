import { useEffect, useState } from 'react'
import { ArrowLeft, Clock3, MapPin } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/i18n'
import { getCompletedRestaurantOrders } from '../services/restaurantApi'
import type { RestaurantOrder } from '../types/restaurant'

function toDayKey(dateValue: string) {
  return dateValue.slice(0, 10)
}

function formatDay(day: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
  }).format(new Date(`${day}T12:00:00`))
}

export function OrderDayPage({ token }: { token: string }) {
  const { day = '' } = useParams()
  const { locale, t } = useI18n()
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const month = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(0, 7) : ''
  const selectedOrders = orders.filter((order) => toDayKey(order.completedAt || order.updatedAt) === day)

  useEffect(() => {
    if (!month) {
      setOrders([])
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    setError('')
    void getCompletedRestaurantOrders(token, month)
      .then((result) => {
        if (active) setOrders(result.orders)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : t('calendar.loadError'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [month, t, token])

  return (
    <section className="grid gap-5">
      <div className="rounded-voro-lg border border-line bg-card p-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-content"
          to="/calendar"
        >
          <ArrowLeft className="size-4" />
          {t('calendar.back')}
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold">
              {t('calendar.dayTitle', { date: day ? formatDay(day, locale) : '-' })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('calendar.dayDesc')}</p>
          </div>
          <span className="rounded-voro-md bg-muted px-3 py-2 text-sm font-bold">
            {t('calendar.orderCount', { count: selectedOrders.length })}
          </span>
        </div>
      </div>

      {error ? <p className="rounded-voro-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3">
        {selectedOrders.map((order) => (
          <article
            className="grid gap-3 rounded-voro-lg border border-line bg-card p-4 lg:grid-cols-[1fr_auto]"
            key={order.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-voro-md bg-content px-3 py-1 text-xs font-bold text-card">
                  {t('common.order').toUpperCase()} {order.id}
                </span>
                <span className="rounded-voro-md bg-muted px-3 py-1 text-xs font-bold">
                  {t(`status.${order.status}`)}
                </span>
              </div>
              <h3 className="mt-3 font-bold">{order.customerName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{order.items.join(', ')}</p>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4" />
                  {order.completedAt
                    ? new Intl.DateTimeFormat(locale, {
                        timeStyle: 'short',
                      }).format(new Date(order.completedAt))
                    : '-'}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  {order.address}
                </span>
              </div>
            </div>
            <div className="grid content-center gap-1 rounded-voro-md bg-muted px-4 py-3 text-right">
              <p className="text-xs font-bold text-muted-foreground">{t('common.total')}</p>
              <p className="font-bold">{order.total}</p>
            </div>
          </article>
        ))}

        {!isLoading && selectedOrders.length === 0 ? (
          <div className="rounded-voro-lg border border-dashed border-line bg-card p-8 text-center">
            <p className="font-bold">{t('calendar.empty')}</p>
          </div>
        ) : null}
        {isLoading ? <div className="rounded-voro-lg border border-line bg-card p-8 text-center text-sm text-muted-foreground">{t('calendar.loading')}</div> : null}
      </div>
    </section>
  )
}
