import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, TrendingUp } from 'lucide-react'
import { translate, type DriverLanguage } from '../../i18n'
import type { DriverAnalytics, DriverHistoryItem } from '../../types/driver'

function dayKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthDays(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const mondayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: count }, (_, index) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`),
  ]
}

function hours(minutes: number) {
  const fullHours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return fullHours ? `${fullHours}h ${remainder}m` : `${remainder}m`
}

export function DriverHistory({ history, analytics, language }: { history: DriverHistoryItem[]; analytics: DriverAnalytics; language: DriverLanguage }) {
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const locale = language === 'en' ? 'en-US' : 'sr-RS'
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date().toISOString()))
  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth])
  const historyByDay = useMemo(() => {
    return history.reduce<Record<string, DriverHistoryItem[]>>((grouped, item) => {
      const key = dayKey(item.deliveredAt)
      grouped[key] = [...(grouped[key] || []), item]
      return grouped
    }, {})
  }, [history])
  const selectedItems = historyByDay[selectedDay] || []
  const summaryCards = [
    { label: t('stats.today'), value: t('stats.deliveriesShort', { count: analytics.today.deliveries }), detail: `${analytics.today.earnings.toFixed(0)} RSD · ${hours(analytics.today.workMinutes)}` },
    { label: t('stats.week'), value: t('stats.deliveriesShort', { count: analytics.week.deliveries }), detail: `${analytics.week.earnings.toFixed(0)} RSD · ${hours(analytics.week.workMinutes)}` },
    { label: t('stats.month'), value: t('stats.deliveriesShort', { count: analytics.month.deliveries }), detail: `${analytics.month.earnings.toFixed(0)} RSD · ${hours(analytics.month.workMinutes)}` },
  ]
  const maxEarnings = Math.max(1, ...analytics.days.map((day) => day.earnings))

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-voro-lg border border-line bg-card p-5">
        <div className="flex items-center gap-2"><CalendarDays className="size-5 text-action" /><h1 className="text-2xl font-bold">{t('history.title')}</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">{t('history.desc')}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article className="rounded-voro-lg border border-line bg-card p-4" key={card.label}>
            <p className="text-sm font-bold text-muted-foreground">{card.label}</p>
            <p className="mt-3 text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-sm text-action">{card.detail}</p>
          </article>
        ))}
      </div>

      <section className="rounded-voro-lg border border-line bg-card p-5">
        <div className="flex items-center gap-2"><TrendingUp className="size-5 text-action" /><h2 className="font-bold">{t('history.lastSevenDays')}</h2></div>
        <div className="mt-5 grid grid-cols-7 items-end gap-1 sm:gap-2">
          {analytics.days.map((day) => (
            <div className="grid min-w-0 gap-2 text-center" key={day.date}>
              <div className="flex h-20 items-end rounded-voro-md bg-muted p-1 sm:h-28">
                <div className="w-full rounded-voro-sm bg-action" style={{ height: `${Math.max(6, (day.earnings / maxEarnings) * 100)}%` }} title={`${day.earnings.toFixed(0)} RSD`} />
              </div>
              <p className="text-xs font-bold">{day.date.slice(8)}</p>
              <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{t('stats.deliveriesShort', { count: day.deliveries })}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-voro-lg border border-line bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{t('history.calendar')}</h2>
          <div className="flex items-center gap-2">
            <button aria-label={t('history.previousMonth')} className="grid size-9 place-items-center rounded-voro-md border border-line hover:bg-muted" onClick={() => changeMonth(-1)} type="button"><ChevronLeft className="size-4" /></button>
            <p className="min-w-40 text-center font-bold capitalize">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(visibleMonth)}</p>
            <button aria-label={t('history.nextMonth')} className="grid size-9 place-items-center rounded-voro-md border border-line hover:bg-muted" onClick={() => changeMonth(1)} type="button"><ChevronRight className="size-4" /></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.6rem] font-bold text-muted-foreground sm:gap-2 sm:text-xs">
          {(language === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']).map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, index) => day ? (
            <button className={`grid min-h-16 content-between rounded-voro-md border p-1.5 text-left transition hover:border-action sm:min-h-20 sm:p-2 ${selectedDay === day ? 'border-action bg-accent' : 'border-line bg-background'}`} key={day} onClick={() => setSelectedDay(day)} type="button">
              <span className="font-bold">{Number(day.slice(-2))}</span>
              {historyByDay[day] ? <span className="justify-self-start rounded-voro-sm bg-action px-1 py-0.5 text-[0.55rem] font-bold text-action-text sm:px-1.5 sm:py-1 sm:text-[10px]"><span className="sm:hidden">{historyByDay[day].length}</span><span className="hidden sm:inline">{t('history.deliveryCount', { count: historyByDay[day].length })}</span></span> : null}
            </button>
          ) : <span className="min-h-16 rounded-voro-md border border-dashed border-line bg-muted/30 sm:min-h-20" key={`blank-${index}`} />)}
        </div>
      </section>

      <section className="rounded-voro-lg border border-line bg-card">
        <div className="border-b border-line px-5 py-4"><h2 className="font-bold">{t('history.deliveriesFor', { date: selectedDay.split('-').reverse().join('.') })}</h2></div>
        {selectedItems.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t('history.empty')}</p> : (
          <div className="divide-y divide-line">
            {selectedItems.map((item) => <article className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto]" key={item.deliveryId}>
              <div className="min-w-0"><p className="text-xs font-bold text-muted-foreground">{t('history.order', { id: item.orderId })}</p><p className="mt-1 font-bold">{item.restaurantName}</p><p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground"><MapPin className="size-3 shrink-0" />{item.customerAddress || t('history.addressFallback')}</p></div>
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><Clock3 className="size-4" />{new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(item.deliveredAt))}</p>
              <p className="font-bold">{item.total.toFixed(0)} RSD</p>
            </article>)}
          </div>
        )}
      </section>
    </section>
  )
}
