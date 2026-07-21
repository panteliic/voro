import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerNotification } from '../../types/customer'
import { customerNotificationText } from './utils/notificationText'

export function NotificationsPanel() {
  const { language, t } = useI18n()
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = () => void customerApi.getNotifications()
      .then((result) => { if (active) { setNotifications(result.notifications); setError('') } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : t('activity.loadError')) })
    load()
    window.addEventListener('voro:customer-notification', load)
    const interval = window.setInterval(load, 60_000)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('voro:customer-notification', load) }
  }, [t])

  async function read(notificationId: number) {
    try {
      await customerApi.readNotification(notificationId)
      setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('activity.readError'))
    }
  }

  return <section className="mx-auto grid max-w-3xl gap-5 pb-8"><header><p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('activity.kicker')}</p><h1 className="mt-2 text-2xl font-bold text-content">{t('activity.title')}</h1><p className="mt-2 text-sm text-muted-foreground">{t('activity.description')}</p></header>{error ? <p className="rounded-voro-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}{notifications.length === 0 ? <div className="rounded-voro-xl border border-dashed border-line bg-card p-10 text-center"><Bell className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-bold">{t('activity.emptyTitle')}</p><p className="mt-1 text-sm text-muted-foreground">{t('activity.emptyDesc')}</p></div> : <div className="divide-y divide-line overflow-hidden rounded-voro-xl border border-line bg-card">{notifications.map((notification) => { const text = customerNotificationText(notification, t); return <article className={`flex gap-3 p-4 ${notification.readAt ? '' : 'bg-accent/40'}`} key={notification.id}><span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-muted text-action"><Bell className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="font-bold text-content">{text.title}</h2><p className="mt-1 text-sm text-muted-foreground">{text.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US')}</p></div>{!notification.readAt ? <button aria-label={t('activity.markRead')} className="grid size-9 shrink-0 place-items-center rounded-voro-md hover:bg-muted" onClick={() => void read(notification.id)} type="button"><CheckCheck className="size-4" /></button> : null}</article> })}</div>}</section>
}
