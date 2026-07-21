import { useEffect, useState } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { getDriverNotifications, readDriverNotification } from '../../services/driverApi'
import type { DriverNotification } from '../../types/driver'
import { translate, type DriverLanguage } from '../../i18n'

export function DriverNotificationsModal({ token, onClose, language }: { token: string; onClose: () => void; language: DriverLanguage }) {
  const t = (key: string) => translate(language, key)
  const [notifications, setNotifications] = useState<DriverNotification[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const load = () => void getDriverNotifications(token).then((result) => { if (active) { setNotifications(result.notifications); setError('') } }).catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : t('notifications.unavailable')) })
    load()
    const interval = window.setInterval(load, 5_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [language, token])
  async function read(id: number) {
    try { await readDriverNotification(token, id); setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t('notifications.updateError')) }
  }
  return <div className="fixed inset-0 z-[1200] bg-background" role="dialog" aria-label={t('notifications.title')} aria-modal="true"><section className="flex h-full w-full flex-col overflow-hidden bg-card"><header className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="font-bold">{t('notifications.title')}</h2><p className="text-xs text-muted-foreground">{t('notifications.description')}</p></div><button aria-label={t('common.close')} className="grid size-9 place-items-center rounded-voro-md hover:bg-muted" onClick={onClose} type="button"><X className="size-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto">{error ? <p className="m-4 rounded-voro-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}{notifications.length === 0 ? <div className="grid min-h-56 place-items-center p-8 text-center text-sm text-muted-foreground"><span><Bell className="mx-auto mb-3 size-6" />{t('notifications.empty')}</span></div> : <div className="divide-y divide-line">{notifications.map((notification) => <article className={`flex gap-3 p-4 ${notification.readAt ? '' : 'bg-accent/40'}`} key={notification.id}><Bell className="mt-0.5 size-4 shrink-0 text-action" /><div className="min-w-0 flex-1"><p className="font-bold">{notification.title}</p><p className="mt-1 text-sm text-muted-foreground">{notification.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US')}</p></div>{!notification.readAt ? <button aria-label={t('notifications.markRead')} className="grid size-8 shrink-0 place-items-center rounded-voro-md hover:bg-muted" onClick={() => void read(notification.id)} type="button"><CheckCheck className="size-4" /></button> : null}</article>)}</div>}</div></section></div>
}
