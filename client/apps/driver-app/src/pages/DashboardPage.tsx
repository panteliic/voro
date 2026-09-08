import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, Bike, CalendarDays, LayoutDashboard, LogOut, MapPinned, MessageCircle, RefreshCw, Settings, Wifi, WifiOff, X, type LucideIcon } from 'lucide-react'
import { ActiveDeliveryMap } from '../components/deliveries/ActiveDeliveryMap'
import { DeliveryOffers } from '../components/deliveries/DeliveryOffers'
import { DriverOrderChatModal } from '../components/deliveries/DriverOrderChatModal'
import { DriverHistory } from '../components/history/DriverHistory'
import { DriverSidebar, type DriverView } from '../components/layout/DriverSidebar'
import { DriverSettings, type DriverTheme } from '../components/settings/DriverSettings'
import { DriverNotificationsModal } from '../components/settings/DriverNotificationsModal'
import { translate, type DriverLanguage } from '../i18n'
import { API_URL } from '../services/apiClient'
import { createSocketClient } from '@voro/socket'
import type { AuthUser } from '../types/auth'
import type { DashboardResponse, DriverNotification } from '../types/driver'

type LiveDriverLocation = { latitude: number; longitude: number }

type DashboardPageProps = {
  dashboard: DashboardResponse | null
  token: string
  user: AuthUser
  status: string
  isLoading: boolean
  isAccepting: boolean
  isUpdatingDelivery: boolean
  showDemoLocation: boolean
  isDemoLocation: boolean
  locationKey: string
  onRefresh: () => void
  onLogout: () => void
  onSetOnline: (isOnline: boolean) => void
  onAcceptOffer: (offerId: number) => void
  onDeclineOffer: (offerId: number) => void
  onUpdateDelivery: (status: 'picked_up' | 'on_the_way' | 'delivered') => void
  onWithdrawFromDelivery: () => void
  onDemoLocationChange: (enabled: boolean) => void
}

function workTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export function DashboardPage({
  dashboard,
  isAccepting,
  isLoading,
  isUpdatingDelivery,
  isDemoLocation,
  locationKey,
  onAcceptOffer,
  onDeclineOffer,
  onLogout,
  onRefresh,
  onDemoLocationChange,
  onSetOnline,
  onUpdateDelivery,
  onWithdrawFromDelivery,
  status,
  token,
  user,
  showDemoLocation,
}: DashboardPageProps) {
  const [view, setView] = useState<DriverView>('home')
  const [theme, setTheme] = useState<DriverTheme>(() => (localStorage.getItem('voro-driver-theme') === 'dark' ? 'dark' : 'light'))
  const [language, setLanguage] = useState<DriverLanguage>(() => (localStorage.getItem('voro-driver-language') === 'en' ? 'en' : 'sr'))
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDeliveryChatOpen, setIsDeliveryChatOpen] = useState(false)
  const [messageNotification, setMessageNotification] = useState<DriverNotification | null>(null)
  const [liveDriverLocation, setLiveDriverLocation] = useState<LiveDriverLocation | null>(null)
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const driver = dashboard?.driver
  const activeDelivery = dashboard?.activeDelivery

  useEffect(() => {
    const latitude = driver?.currentLatitude
    const longitude = driver?.currentLongitude
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      setLiveDriverLocation(null)
      return
    }

    setLiveDriverLocation((current) =>
      current?.latitude === latitude && current.longitude === longitude
        ? current
        : { latitude, longitude },
    )
  }, [driver?.currentLatitude, driver?.currentLongitude])

  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', theme === 'dark')
    document.documentElement.classList.toggle('light-theme', theme === 'light')
    localStorage.setItem('voro-driver-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('voro-driver-language', language)
  }, [language])

  useEffect(() => {
    if (!activeDelivery) setIsDeliveryChatOpen(false)
  }, [activeDelivery])

  useEffect(() => {
    const socket = createSocketClient(API_URL, { auth: { token } })

    socket.on('notification:new', (notification: DriverNotification) => {
      if (notification.type !== 'new_message') return
      setMessageNotification(notification)

      if (!('Notification' in window)) return
      const showBrowserNotification = () => {
        if (document.visibilityState !== 'visible') {
          new Notification(notification.title, { body: notification.body, icon: '/logo.svg' })
        }
      }

      if (Notification.permission === 'granted') {
        showBrowserNotification()
      }
    })
    socket.on('driver:location', (location: LiveDriverLocation) => {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return
      setLiveDriverLocation(location)
    })
    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [token])

  useEffect(() => {
    if (!messageNotification) return
    const timeout = window.setTimeout(() => setMessageNotification(null), 7_000)
    return () => window.clearTimeout(timeout)
  }, [messageNotification])

  const navItems: Array<{ id: DriverView; label: string; icon: LucideIcon }> = [
    { id: 'home', label: t('nav.home'), icon: LayoutDashboard },
    { id: 'history', label: t('nav.history'), icon: CalendarDays },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ]
  const pageTitle = isDeliveryChatOpen ? t('chat.customerTitle') : navItems.find((item) => item.id === view)?.label || t('nav.home')
  const statItems = dashboard
    ? [
        { label: t('stats.today'), value: t('stats.deliveriesShort', { count: dashboard.analytics.today.deliveries }), detail: `${dashboard.analytics.today.earnings.toFixed(0)} RSD` },
        { label: t('stats.week'), value: t('stats.deliveriesShort', { count: dashboard.analytics.week.deliveries }), detail: workTime(dashboard.analytics.week.workMinutes) },
        { label: t('stats.month'), value: t('stats.deliveriesShort', { count: dashboard.analytics.month.deliveries }), detail: `${dashboard.analytics.month.earnings.toFixed(0)} RSD` },
      ]
    : []

  return (
    <main className={`${isDeliveryChatOpen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} bg-background text-content lg:flex`}>
      <DriverSidebar
        driverName={driver?.name || user.name}
        email={user.email}
        navItems={navItems}
        onViewChange={setView}
        vehicleType={driver?.vehicleType || t('driver.fallbackRole')}
        view={view}
        workspaceLabel={t('sidebar.workspace')}
      />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <header className="flex min-h-[4.25rem] items-center border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            {isDeliveryChatOpen ? <button className="inline-flex items-center gap-2 rounded-voro-md px-1 py-1 text-left text-sm font-bold hover:bg-muted" onClick={() => setIsDeliveryChatOpen(false)} type="button"><ArrowLeft className="size-4" />{pageTitle}</button> : <p className="truncate text-sm font-bold">{pageTitle}</p>}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <button
              className={`flex items-center gap-1 rounded-voro-md border px-2 py-2 text-xs font-bold sm:gap-2 sm:px-3 sm:text-sm ${driver?.isOnline ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-line text-muted-foreground'}`}
              onClick={() => onSetOnline(!driver?.isOnline)}
              type="button"
            >
              {driver?.isOnline ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
              {driver?.isOnline ? t('common.online') : t('common.offline')}
            </button>
            <button aria-label={t('common.refresh')} className="grid size-9 place-items-center rounded-voro-md border border-line hover:bg-muted" disabled={isLoading} onClick={onRefresh} type="button"><RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
            <button aria-label={t('common.activity')} className="grid size-9 place-items-center rounded-voro-md border border-line hover:bg-muted" onClick={() => setIsNotificationsOpen(true)} type="button"><Bell className="size-4" /></button>
            <button aria-label={t('common.logout')} className="grid size-9 place-items-center rounded-voro-md border border-line hover:bg-muted" onClick={onLogout} type="button"><LogOut className="size-4" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(4rem+max(env(safe-area-inset-bottom),0.5rem))] pt-5 sm:px-6 lg:px-8 lg:py-7">
        <section className="relative grid gap-5">
          {status ? <p className="rounded-voro-lg border border-line bg-card px-4 py-3 text-sm font-medium">{status}</p> : null}

          {view === 'home' ? (
            <>
              <section className="grid gap-3 md:grid-cols-3">
                {statItems.map((item) => <article className="rounded-voro-lg border border-line bg-card p-4" key={item.label}><p className="text-sm font-bold text-muted-foreground">{item.label}</p><p className="mt-3 text-2xl font-bold">{item.value}</p><p className="mt-1 text-sm text-action">{item.detail}</p></article>)}
              </section>

              {!driver?.isOnline ? <section className="rounded-voro-lg border border-dashed border-line bg-card p-8 text-center"><WifiOff className="mx-auto size-7 text-muted-foreground" /><h1 className="mt-3 font-bold">{t('home.offlineTitle')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('home.offlineDesc')}</p></section> : null}
              {driver?.isOnline && !activeDelivery ? <DeliveryOffers isAccepting={isAccepting} language={language} offers={dashboard?.offers || []} onAccept={onAcceptOffer} onDecline={onDeclineOffer} token={token} /> : null}
              {activeDelivery ? <ActiveDeliveryMap currentLocation={liveDriverLocation} delivery={activeDelivery} isUpdating={isUpdatingDelivery} language={language} locationKey={locationKey} onOpenChat={() => setIsDeliveryChatOpen(true)} onUpdateStatus={onUpdateDelivery} onWithdraw={onWithdrawFromDelivery} token={token} /> : null}
              {activeDelivery ? null : (
                <section className="rounded-voro-lg border border-line bg-card p-8 text-center"><Bike className="mx-auto size-8 text-action" /><h1 className="mt-3 text-xl font-bold">{t('home.readyTitle')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('home.readyDesc')}</p><p className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground"><MapPinned className="size-4" />{t('home.locationHint')}</p></section>
              )}
            </>
          ) : null}
          {view === 'history' && dashboard ? <DriverHistory analytics={dashboard.analytics} history={dashboard.history} language={language} /> : null}
          {view === 'settings' ? <DriverSettings isDemoLocation={isDemoLocation} language={language} onDemoLocationChange={onDemoLocationChange} onLanguageChange={setLanguage} onThemeChange={setTheme} showDemoLocation={showDemoLocation} theme={theme} token={token} /> : null}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-3 gap-1">
          {navItems.map(({ icon: Icon, id, label }) => <button aria-current={view === id ? 'page' : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-voro-md px-1 text-[0.65rem] font-bold leading-none transition ${view === id ? 'bg-accent text-action' : 'text-muted-foreground hover:bg-muted hover:text-content'}`} key={id} onClick={() => setView(id)} type="button"><Icon className="size-5 shrink-0" /><span className="max-w-full truncate">{label}</span></button>)}
        </div>
      </nav>
      {isNotificationsOpen ? <DriverNotificationsModal language={language} onClose={() => setIsNotificationsOpen(false)} token={token} /> : null}
      {isDeliveryChatOpen && activeDelivery ? <DriverOrderChatModal language={language} orderId={activeDelivery.orderId} token={token} withinWorkspace /> : null}
      {messageNotification ? <aside className="fixed bottom-5 right-4 z-[1400] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-voro-lg border border-line bg-card p-3 shadow-2xl" role="status"><span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><MessageCircle className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-bold">{messageNotification.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{messageNotification.body}</p></div><button aria-label={t('common.dismiss')} className="grid size-8 shrink-0 place-items-center rounded-voro-md hover:bg-muted" onClick={() => setMessageNotification(null)} type="button"><X className="size-4" /></button></aside> : null}
      </div>
    </main>
  )
}
