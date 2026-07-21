import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Clock3, MessageSquareWarning, PackageCheck, RotateCcw, Search, Star } from 'lucide-react'
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

function HistoryOrderCard({ order, onRefresh }: { order: CustomerOrder; onRefresh: () => void }) {
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
  const [mode, setMode] = useState<'review' | 'issue' | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [issueCategory, setIssueCategory] = useState('late_delivery')
  const [issueDescription, setIssueDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function reorder() {
    setIsSaving(true)
    try {
      await customerApi.reorderOrder(order.id)
      setFeedback(t('orders.reordered'))
      onRefresh()
    } catch (requestError) {
      setFeedback(requestError instanceof Error ? requestError.message : t('orders.reorderError'))
    } finally { setIsSaving(false) }
  }

  async function submitReview() {
    setIsSaving(true)
    try {
      await customerApi.createOrderReview(order.id, { rating, comment })
      setFeedback(t('orders.reviewThanks'))
      setMode(null)
    } catch (requestError) {
      setFeedback(requestError instanceof Error ? requestError.message : t('orders.reviewError'))
    } finally { setIsSaving(false) }
  }

  async function submitIssue() {
    setIsSaving(true)
    try {
      await customerApi.createOrderIssue(order.id, { category: issueCategory, description: issueDescription })
      setFeedback(t('orders.reportSent'))
      setMode(null)
      setIssueDescription('')
    } catch (requestError) {
      setFeedback(requestError instanceof Error ? requestError.message : t('orders.reportError'))
    } finally { setIsSaving(false) }
  }

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
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-voro-md border border-line px-3 py-2 text-xs font-bold text-action hover:bg-accent" disabled={isSaving} onClick={() => void reorder()} type="button"><RotateCcw className="size-3.5" />{t('orders.reorder')}</button>
        {order.status === 'delivered' ? <button className="inline-flex items-center gap-1.5 rounded-voro-md border border-line px-3 py-2 text-xs font-bold hover:bg-muted" onClick={() => setMode(mode === 'review' ? null : 'review')} type="button"><Star className="size-3.5" />{t('orders.rate')}</button> : null}
        <button className="inline-flex items-center gap-1.5 rounded-voro-md border border-line px-3 py-2 text-xs font-bold hover:bg-muted" onClick={() => setMode(mode === 'issue' ? null : 'issue')} type="button"><MessageSquareWarning className="size-3.5" />{t('orders.reportIssue')}</button>
      </div>
      {mode === 'review' ? <form className="mt-3 rounded-voro-lg bg-muted p-3" onSubmit={(event) => { event.preventDefault(); void submitReview() }}><div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button aria-label={t('orders.stars', { count: value })} className={`rounded p-1 ${value <= rating ? 'text-action' : 'text-muted-foreground'}`} key={value} onClick={() => setRating(value)} type="button"><Star className="size-5 fill-current" /></button>)}</div><textarea className="mt-2 min-h-20 w-full rounded-voro-md border border-line bg-card p-2 text-sm" maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder={t('orders.reviewPlaceholder')} value={comment} /><button className="mt-2 rounded-voro-md bg-action px-3 py-2 text-xs font-bold text-action-text disabled:opacity-50" disabled={isSaving} type="submit">{t('orders.sendReview')}</button></form> : null}
      {mode === 'issue' ? <form className="mt-3 rounded-voro-lg bg-muted p-3" onSubmit={(event) => { event.preventDefault(); void submitIssue() }}><select className="w-full rounded-voro-md border border-line bg-card p-2 text-sm" onChange={(event) => setIssueCategory(event.target.value)} value={issueCategory}><option value="late_delivery">{t('orders.issue.lateDelivery')}</option><option value="missing_item">{t('orders.issue.missingItem')}</option><option value="wrong_item">{t('orders.issue.wrongItem')}</option><option value="quality">{t('orders.issue.quality')}</option><option value="courier">{t('orders.issue.courier')}</option><option value="other">{t('orders.issue.other')}</option></select><textarea className="mt-2 min-h-20 w-full rounded-voro-md border border-line bg-card p-2 text-sm" maxLength={2000} minLength={5} onChange={(event) => setIssueDescription(event.target.value)} placeholder={t('orders.issuePlaceholder')} required value={issueDescription} /><button className="mt-2 rounded-voro-md bg-action px-3 py-2 text-xs font-bold text-action-text disabled:opacity-50" disabled={isSaving} type="submit">{t('orders.sendReport')}</button></form> : null}
      {feedback ? <p className="mt-3 text-sm font-medium text-action">{feedback}</p> : null}
    </article>
  )
}

export function OrdersPanel() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'active' | 'history'>('active')

  async function refreshOrders() {
    try {
      const result = await customerApi.getOrders()
      setOrders(result.orders)
    } catch {}
  }

  async function cancelOrder(order: CustomerOrder) {
    if (!window.confirm(t('orders.cancelConfirm', { id: order.id }))) return
    try {
      await customerApi.cancelOrder(order.id)
      await refreshOrders()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('orders.cancelError'))
    }
  }

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

    const refreshFromRealtimeEvent = () => {
      customerApi.getOrders().then(({ orders: nextOrders }) => updateOrders(nextOrders)).catch(() => {})
    }

    // Status notifications arrive over Socket.IO. Keep a slow HTTP fallback
    // for reconnections and a tab that was asleep in the background.
    window.addEventListener('voro:customer-order-change', refreshFromRealtimeEvent)
    const refreshInterval = window.setInterval(refreshFromRealtimeEvent, 60_000)

    return () => {
      isMounted = false
      window.clearInterval(refreshInterval)
      window.removeEventListener('voro:customer-order-change', refreshFromRealtimeEvent)
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

        {visibleOrders.length > 0 ? <div className={isSingleActiveOrder ? 'min-h-0 flex-1' : tab === 'active' ? 'grid gap-4 pb-3' : 'grid gap-3'}>
          {tab === 'active'
            ? activeOrders.map((order) => (
                <OrderRouteMap
                  allowCancel={order.status === 'pending'}
                  estimatedDeliveryRange={order.estimatedDeliveryRange}
                  fillAvailableHeight={isSingleActiveOrder}
                  key={order.id}
                  onCancel={() => void cancelOrder(order)}
                  orderId={order.id}
                />
              ))
            : previousOrders.map((order) => <HistoryOrderCard key={order.id} onRefresh={() => void refreshOrders()} order={order} />)}
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
