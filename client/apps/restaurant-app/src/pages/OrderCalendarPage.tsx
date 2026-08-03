import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/i18n'
import { getCompletedRestaurantOrders } from '../services/restaurantApi'
import type { RestaurantOrder } from '../types/restaurant'

const weekDays: Record<'en' | 'sr', string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  sr: ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'],
}

function toDayKey(dateValue: string) {
  return dateValue.slice(0, 10)
}

function formatDayTitle(day: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
  }).format(new Date(`${day}T12:00:00`))
}

function formatMonth(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getMonthDays(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstDay = new Date(year, monthIndex, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const leadingBlanks = Array.from({ length: mondayOffset }, () => null)
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })

  return [...leadingBlanks, ...days]
}

function monthKey(month: Date) {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
}

export function OrderCalendarPage({ token }: { token: string }) {
  const { language, locale, t } = useI18n()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    void getCompletedRestaurantOrders(token, monthKey(visibleMonth))
      .then((result) => {
        if (!controller.signal.aborted) setOrders(result.orders)
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setOrders([])
          setError(requestError instanceof Error ? requestError.message : t('calendar.loadError'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [token, visibleMonth, t])

  const orderCountByDay = useMemo(() => {
    return orders.reduce<Record<string, number>>((counts, order) => {
      const day = toDayKey(order.completedAt || order.updatedAt)
      counts[day] = (counts[day] || 0) + 1
      return counts
    }, {})
  }, [orders])

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 rounded-voro-lg border border-line bg-card p-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-action" />
            <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('calendar.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={t('calendar.previousMonth')}
            className="grid size-10 place-items-center rounded-voro-md border border-line text-muted-foreground hover:bg-muted"
            onClick={() => changeMonth(-1)}
            type="button"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="min-w-44 text-center text-lg font-bold capitalize">
            {formatMonth(visibleMonth, locale)}
          </p>
          <button
            aria-label={t('calendar.nextMonth')}
            className="grid size-10 place-items-center rounded-voro-md border border-line text-muted-foreground hover:bg-muted"
            onClick={() => changeMonth(1)}
            type="button"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {error ? <p className="rounded-voro-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <section className="rounded-voro-lg border border-line bg-card p-1.5 sm:p-3">
        <div className="grid grid-cols-7 gap-1 px-0.5 pb-1.5 text-center text-[0.65rem] font-bold text-muted-foreground sm:gap-2 sm:px-1 sm:pb-2 sm:text-xs md:text-sm">
          {weekDays[language].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {monthDays.map((day, index) =>
            day ? (
              <Link
                aria-label={t('calendar.openDay', { date: formatDayTitle(day, locale) })}
                className="grid min-h-16 rounded-voro-md border border-line bg-background p-1.5 text-left transition hover:border-action hover:bg-accent sm:min-h-28 sm:rounded-voro-lg sm:p-3 lg:min-h-32"
                key={day}
                to={`/calendar/${day}`}
              >
                <span className="text-sm font-bold sm:text-lg">{Number(day.slice(-2))}</span>
                {isLoading ? <span className="mt-auto h-4 w-8 animate-pulse rounded bg-muted" /> : null}
                {!isLoading && orderCountByDay[day] ? (
                  <span className="mt-auto justify-self-start rounded-voro-sm bg-action px-1 py-0.5 text-[0.55rem] font-bold text-white sm:rounded-voro-md sm:px-2 sm:py-1 sm:text-xs">
                    <span className="sm:hidden">{orderCountByDay[day]}</span>
                    <span className="hidden sm:inline">{t('calendar.orderCount', { count: orderCountByDay[day] })}</span>
                  </span>
                ) : null}
              </Link>
            ) : (
              <span
                className="min-h-16 rounded-voro-md border border-dashed border-line bg-muted/30 sm:min-h-28 sm:rounded-voro-lg lg:min-h-32"
                key={`blank-${index}`}
              />
            ),
          )}
        </div>
      </section>
    </section>
  )
}
