import { useEffect, useState, type CSSProperties } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Settings, X } from 'lucide-react'
import { createSocketClient } from '@voro/socket'
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'
import {
  getDashboardView,
  getSettingsSection,
} from '../components/dashboard/utils/dashboardUtils'
import { dashboardNavItems } from '../components/dashboard/data/dashboardData'
import { customerNotificationText } from '../components/dashboard/utils/notificationText'
import { OrdersPanel } from '../components/dashboard/OrdersPanel'
import { RestaurantDiscoveryPanel } from '../components/dashboard/RestaurantDiscoveryPanel'
import { RestaurantMenuPanel } from '../components/dashboard/RestaurantMenuPanel'
import { CheckoutPanel } from '../components/dashboard/CheckoutPanel'
import { CartPanel } from '../components/dashboard/CartPanel'
import { NotificationsPanel } from '../components/dashboard/NotificationsPanel'
import { SettingsPanel } from '../components/dashboard/settings/SettingsPanel'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout, logoutUser } from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'
import { customerApi } from '../services/customerApi'
import type { CustomerNotification, CustomerProfile } from '../types/customer'
import { checkoutDraftChangedEvent, loadCheckoutDraft } from '../types/checkout'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function Home() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { accessToken, logoutStatus, refreshToken, user } = useAppSelector((state) => state.auth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const activeView = getDashboardView(location.pathname)
  const activeSettingsSection = getSettingsSection(location.pathname)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [messageNotification, setMessageNotification] = useState<CustomerNotification | null>(null)
  const [cartItemCount, setCartItemCount] = useState(
    () => loadCheckoutDraft()?.items.reduce((sum, item) => sum + item.quantity, 0) || 0,
  )
  const name = user?.name || 'korisnice'
  const displayName = profile?.user.name || user?.name || name
  const firstName = displayName.split(' ')[0] || displayName
  const defaultAddress = profile?.addresses.find((address) => address.isDefault) || profile?.addresses[0]
  const deliveryAddress = defaultAddress
    ? [defaultAddress.label, defaultAddress.street, defaultAddress.city].filter(Boolean).join(' · ')
    : ''
  const isLoggingOut = logoutStatus === 'loading'

  useEffect(() => {
    let isMounted = true

    customerApi
      .getProfile()
      .then((result) => {
        if (isMounted) {
          setProfile(result)
          setProfileError('')
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setProfileError(error instanceof Error ? error.message : t('account.error'))
        }
      })

    return () => {
      isMounted = false
    }
  }, [t])

  useEffect(() => {
    const token = accessToken || window.localStorage.getItem('voro_access_token') || ''
    if (!token) return

    const socket = createSocketClient(SOCKET_URL, { auth: { token } })
    socket.on('notification:new', (notification: CustomerNotification) => {
      window.dispatchEvent(new CustomEvent('voro:customer-notification', { detail: notification }))
      if (typeof notification.data.orderId === 'number') {
        window.dispatchEvent(new CustomEvent('voro:customer-order-change', { detail: notification.data.orderId }))
      }
      if (notification.type !== 'new_message') return
      setMessageNotification(notification)
      const text = customerNotificationText(notification, t)

      if (!('Notification' in window)) return
      const showBrowserNotification = () => {
        if (document.visibilityState !== 'visible') {
          new Notification(text.title, { body: text.body, icon: '/logo.svg' })
        }
      }

      if (Notification.permission === 'granted') {
        showBrowserNotification()
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission().then((permission) => {
          if (permission === 'granted') showBrowserNotification()
        })
      }
    })
    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [accessToken, t])

  useEffect(() => {
    if (!messageNotification) return
    const timeout = window.setTimeout(() => setMessageNotification(null), 7_000)
    return () => window.clearTimeout(timeout)
  }, [messageNotification])

  useEffect(() => {
    const updateCartItemCount = () => {
      setCartItemCount(loadCheckoutDraft()?.items.reduce((sum, item) => sum + item.quantity, 0) || 0)
    }

    window.addEventListener(checkoutDraftChangedEvent, updateCartItemCount)
    return () => window.removeEventListener(checkoutDraftChangedEvent, updateCartItemCount)
  }, [])

  async function handleLogout() {
    if (refreshToken) {
      await dispatch(logoutUser({ refreshToken }))
    } else {
      dispatch(logout())
    }

    navigate('/login', { replace: true })
  }

  return (
    <main
      className="h-screen overflow-hidden bg-background text-content"
      style={{ '--customer-sidebar-width': isSidebarCollapsed ? '6rem' : '17rem' } as CSSProperties}
    >
      <div
        className={`grid h-full grid-rows-1 transition-[grid-template-columns] duration-200 ${
          isSidebarCollapsed ? 'lg:grid-cols-[6rem_1fr]' : 'lg:grid-cols-[17rem_1fr]'
        }`}
      >
        <DashboardSidebar
          activeSettingsSection={activeSettingsSection}
          activeView={activeView}
          cartItemCount={cartItemCount}
          className="hidden lg:flex"
          isCollapsed={isSidebarCollapsed}
          isLoggingOut={isLoggingOut}
          name={name}
          onLogout={handleLogout}
          onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
          userName={user?.name}
        />

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 pb-[calc(4.75rem+max(env(safe-area-inset-bottom),0.5rem))] pt-5 sm:px-6 lg:px-8 lg:py-5">
          {profileError ? (
            <div className="mb-5 rounded-voro-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {profileError}
            </div>
          ) : null}

          {activeView === 'overview' ? (
            <RestaurantDiscoveryPanel deliveryAddress={deliveryAddress} userName={firstName} />
          ) : null}
          {activeView === 'search' ? (
            <RestaurantDiscoveryPanel showSearch />
          ) : null}
          {activeView === 'cart' ? <CartPanel /> : null}
          {activeView === 'favorites' ? <RestaurantDiscoveryPanel favoritesOnly /> : null}
          {activeView === 'orders' ? (
            <OrdersPanel />
          ) : null}
          {activeView === 'notifications' ? <NotificationsPanel /> : null}
          {activeView === 'restaurant' ? <RestaurantMenuPanel /> : null}
          {activeView === 'checkout' ? <CheckoutPanel profile={profile} /> : null}
          {activeView === 'settings' ? (
            <SettingsPanel
              activeSection={activeSettingsSection}
              profile={profile}
              setProfile={setProfile}
            />
          ) : null}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-7 gap-1">
          {[...dashboardNavItems, { icon: Settings, id: 'settings' as const, path: '/settings' }].map(({ icon: Icon, id, path }) => {
            const isActive = activeView === id
            const label = t(`nav.${id}`)

            return (
              <NavLink
                aria-label={label}
                className={`relative grid min-h-14 min-w-0 place-items-center rounded-voro-lg px-1 transition ${
                  isActive
                    ? 'bg-accent text-content'
                    : 'text-muted-foreground hover:bg-muted hover:text-content'
                }`}
                key={id}
                title={label}
                to={path}
              >
                <Icon className="size-5 shrink-0" />
                {id === 'cart' && cartItemCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-action px-1 text-[0.6rem] leading-4 text-action-text">
                    {cartItemCount}
                  </span>
                ) : null}
              </NavLink>
            )
          })}
        </div>
      </nav>
      {messageNotification ? <aside className="fixed bottom-24 right-4 z-[1400] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-voro-lg border border-line bg-card p-3 shadow-2xl lg:bottom-5" role="status"><span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><MessageCircle className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-bold">{customerNotificationText(messageNotification, t).title}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{customerNotificationText(messageNotification, t).body}</p></div><button aria-label={t('common.close')} className="grid size-8 shrink-0 place-items-center rounded-voro-md hover:bg-muted" onClick={() => setMessageNotification(null)} type="button"><X className="size-4" /></button></aside> : null}
    </main>
  )
}

export default Home
