import { useEffect, useState } from 'react'
import { Bell, Clock3, MapPinned, Power, Save, WandSparkles } from 'lucide-react'
import { useI18n } from '../i18n/i18n'
import type { DashboardResponse, RestaurantOperations } from '../types/restaurant'

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const allDayHours = () => Object.fromEntries(days.map((key) => [key, { enabled: true, open: '00:00', close: '23:59' }]))

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function OperationsPage({ dashboard, isSaving, onSave }: {
  dashboard: DashboardResponse | null
  isSaving: boolean
  onSave: (payload: RestaurantOperations) => Promise<void>
}) {
  const { t } = useI18n()
  const restaurant = dashboard?.restaurant
  const [operations, setOperations] = useState<RestaurantOperations>({
    deliveryRadiusKm: 8,
    openingHours: allDayHours(),
    isAcceptingOrders: true,
    preparationMinutes: 20,
    busyUntil: null,
    autoAcceptOrders: false,
  })

  useEffect(() => {
    if (!restaurant) return
    setOperations({
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      openingHours: { ...allDayHours(), ...restaurant.openingHours },
      isAcceptingOrders: restaurant.isAcceptingOrders,
      preparationMinutes: restaurant.preparationMinutes || 20,
      busyUntil: restaurant.busyUntil,
      autoAcceptOrders: restaurant.autoAcceptOrders,
    })
  }, [restaurant])

  if (!restaurant) return <section className="rounded-voro-lg border border-line bg-card p-5 text-sm text-muted-foreground">{t('operations.loading')}</section>

  return <section className="grid gap-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('operations.kicker')}</p>
      <h1 className="mt-2 text-2xl font-bold">{t('operations.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('operations.description')}</p>
    </header>

    <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); void onSave(operations) }}>
      <section className="grid gap-4 rounded-voro-lg border border-line bg-card p-5 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3"><input checked={operations.isAcceptingOrders} className="mt-1 size-4 accent-action" onChange={(event) => setOperations((current) => ({ ...current, isAcceptingOrders: event.target.checked }))} type="checkbox" /><span><span className="flex items-center gap-2 font-bold"><Power className="size-4 text-action" />{t('operations.acceptOrders')}</span><span className="mt-1 block text-sm text-muted-foreground">{t('operations.acceptOrdersDesc')}</span></span></label>
        <label><span className="flex items-center gap-2 font-bold"><MapPinned className="size-4 text-action" />{t('operations.deliveryRadius')}</span><span className="mt-1 block text-sm text-muted-foreground">{t('operations.deliveryRadiusDesc')}</span><div className="mt-3 flex max-w-xs items-center gap-2"><input className="w-full rounded-voro-md border border-line bg-background px-3 py-2" max="50" min="0.1" onChange={(event) => setOperations((current) => ({ ...current, deliveryRadiusKm: Number(event.target.value) }))} step="0.5" type="number" value={operations.deliveryRadiusKm} /><span className="text-sm font-bold">km</span></div></label>
      </section>

      <section className="grid gap-4 rounded-voro-lg border border-line bg-card p-5 md:grid-cols-3">
        <label><span className="flex items-center gap-2 font-bold"><Clock3 className="size-4 text-action" />{t('operations.preparationTime')}</span><p className="mt-1 text-sm text-muted-foreground">{t('operations.preparationTimeDesc')}</p><input className="mt-3 w-full rounded-voro-md border border-line bg-background px-3 py-2" max="180" min="5" onChange={(event) => setOperations((current) => ({ ...current, preparationMinutes: Number(event.target.value) }))} type="number" value={operations.preparationMinutes} /></label>
        <label><span className="flex items-center gap-2 font-bold"><Clock3 className="size-4 text-action" />{t('operations.busyUntil')}</span><p className="mt-1 text-sm text-muted-foreground">{t('operations.busyUntilDesc')}</p><input className="mt-3 w-full rounded-voro-md border border-line bg-background px-3 py-2" onChange={(event) => setOperations((current) => ({ ...current, busyUntil: event.target.value ? new Date(event.target.value).toISOString() : null }))} type="datetime-local" value={localDateTime(operations.busyUntil)} /></label>
        <label className="flex cursor-pointer items-start gap-3"><input checked={operations.autoAcceptOrders} className="mt-1 size-4 accent-action" onChange={(event) => setOperations((current) => ({ ...current, autoAcceptOrders: event.target.checked }))} type="checkbox" /><span><span className="flex items-center gap-2 font-bold"><WandSparkles className="size-4 text-action" />{t('operations.autoAccept')}</span><span className="mt-1 block text-sm text-muted-foreground">{t('operations.autoAcceptDesc')}</span></span></label>
      </section>

      <section className="rounded-voro-lg border border-line bg-card"><div className="border-b border-line px-5 py-4"><h2 className="font-bold">{t('operations.openingHours')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('operations.openingHoursDesc')}</p></div><div className="divide-y divide-line">{days.map((key) => { const label = t(`day.${key}`); const day = operations.openingHours[key] || { enabled: false, open: '00:00', close: '23:59' }; return <div className="grid gap-3 px-5 py-3 sm:grid-cols-[9rem_1fr_auto_auto] sm:items-center" key={key}><label className="flex items-center gap-2 text-sm font-bold"><input checked={day.enabled} className="size-4 accent-action" onChange={(event) => setOperations((current) => ({ ...current, openingHours: { ...current.openingHours, [key]: { ...day, enabled: event.target.checked } } }))} type="checkbox" />{label}</label><span className="text-sm text-muted-foreground">{day.enabled ? t('operations.open') : t('operations.closed')}</span><input aria-label={t('operations.openingTime', { day: label })} className="rounded-voro-md border border-line bg-background px-3 py-2 text-sm disabled:opacity-50" disabled={!day.enabled} onChange={(event) => setOperations((current) => ({ ...current, openingHours: { ...current.openingHours, [key]: { ...day, open: event.target.value } } }))} type="time" value={day.open} /><input aria-label={t('operations.closingTime', { day: label })} className="rounded-voro-md border border-line bg-background px-3 py-2 text-sm disabled:opacity-50" disabled={!day.enabled} onChange={(event) => setOperations((current) => ({ ...current, openingHours: { ...current.openingHours, [key]: { ...day, close: event.target.value } } }))} type="time" value={day.close} /></div> })}</div></section>
      <button className="inline-flex w-fit items-center gap-2 rounded-voro-md bg-action px-4 py-3 text-sm font-bold text-action-text disabled:opacity-60" disabled={isSaving} type="submit"><Save className="size-4" />{isSaving ? t('operations.saving') : t('operations.save')}</button>
    </form>

    <section className="rounded-voro-lg border border-line bg-card"><div className="flex items-center gap-2 border-b border-line px-5 py-4"><Bell className="size-4 text-action" /><div><h2 className="font-bold">{t('operations.activity')}</h2><p className="text-sm text-muted-foreground">{t('operations.unread', { count: dashboard.unreadNotifications })}</p></div></div>{dashboard.notifications.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t('operations.emptyActivity')}</p> : <div className="divide-y divide-line">{dashboard.notifications.slice(0, 8).map((notification) => <article className={`p-4 ${notification.readAt ? '' : 'bg-accent/40'}`} key={notification.id}><p className="font-bold">{notification.title}</p><p className="mt-1 text-sm text-muted-foreground">{notification.body}</p></article>)}</div>}</section>
  </section>
}
