import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { customerApi } from '../../services/customerApi'
import type { CustomerNotification } from '../../types/customer'

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = () => void customerApi.getNotifications()
      .then((result) => { if (active) { setNotifications(result.notifications); setError('') } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Notifications could not be loaded.') })
    load()
    const interval = window.setInterval(load, 5_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [])

  async function read(notificationId: number) {
    try {
      await customerApi.readNotification(notificationId)
      setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Notification could not be updated.')
    }
  }

  return <section className="mx-auto grid max-w-3xl gap-5 pb-8"><header><p className="text-xs font-bold uppercase tracking-[0.14em] text-action">Voro activity</p><h1 className="mt-2 text-2xl font-bold text-content">Notifications</h1><p className="mt-2 text-sm text-muted-foreground">Order, courier, chat, and support updates appear here in real time.</p></header>{error ? <p className="rounded-voro-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}{notifications.length === 0 ? <div className="rounded-voro-xl border border-dashed border-line bg-card p-10 text-center"><Bell className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-bold">You are all caught up</p><p className="mt-1 text-sm text-muted-foreground">New delivery updates will appear here.</p></div> : <div className="divide-y divide-line overflow-hidden rounded-voro-xl border border-line bg-card">{notifications.map((notification) => <article className={`flex gap-3 p-4 ${notification.readAt ? '' : 'bg-accent/40'}`} key={notification.id}><span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-muted text-action"><Bell className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="font-bold text-content">{notification.title}</h2><p className="mt-1 text-sm text-muted-foreground">{notification.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p></div>{!notification.readAt ? <button aria-label="Mark as read" className="grid size-9 shrink-0 place-items-center rounded-voro-md hover:bg-muted" onClick={() => void read(notification.id)} type="button"><CheckCheck className="size-4" /></button> : null}</article>)}</div>}</section>
}
