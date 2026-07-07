import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { demoOrders } from '../data/demoOrders'
import { useI18n } from '../i18n/i18n'

const historyOrders = demoOrders.filter((order) => order.completedAt)
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

export function OrderCalendarPage() {
  const { language, locale, t } = useI18n()
  const latestOrderDay = historyOrders[0]
    ? toDayKey(historyOrders[0].completedAt || historyOrders[0].createdAt)
    : toDayKey(new Date().toISOString())
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = latestOrderDay.split('-').map(Number)
    return new Date(year, month - 1, 1)
  })
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth])
  const orderCountByDay = useMemo(() => {
    return historyOrders.reduce<Record<string, number>>((counts, order) => {
      const day = toDayKey(order.completedAt || order.createdAt)
      counts[day] = (counts[day] || 0) + 1
      return counts
    }, {})
  }, [])

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

      <section className="rounded-voro-lg border border-line bg-card p-3">
        <div className="grid grid-cols-7 gap-2 px-1 pb-2 text-center text-xs font-bold text-muted-foreground md:text-sm">
          {weekDays[language].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((day, index) =>
            day ? (
              <Link
                aria-label={t('calendar.openDay', { date: formatDayTitle(day, locale) })}
                className="grid min-h-24 rounded-voro-lg border border-line bg-background p-3 text-left transition hover:border-action hover:bg-accent sm:min-h-28 lg:min-h-32"
                key={day}
                to={`/calendar/${day}`}
              >
                <span className="text-lg font-bold">{Number(day.slice(-2))}</span>
                {orderCountByDay[day] ? (
                  <span className="mt-auto justify-self-start rounded-voro-md bg-action px-2 py-1 text-xs font-bold text-white">
                    {t('calendar.orderCount', { count: orderCountByDay[day] })}
                  </span>
                ) : null}
              </Link>
            ) : (
              <span
                className="min-h-24 rounded-voro-lg border border-dashed border-line bg-muted/30 sm:min-h-28 lg:min-h-32"
                key={`blank-${index}`}
              />
            ),
          )}
        </div>
      </section>
    </section>
  )
}
