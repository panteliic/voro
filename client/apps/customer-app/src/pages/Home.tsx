import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'
import {
  getDashboardView,
  getSettingsSection,
} from '../components/dashboard/utils/dashboardUtils'
import { dashboardNavItems } from '../components/dashboard/data/dashboardData'
import { OrdersPanel } from '../components/dashboard/OrdersPanel'
import { RestaurantDiscoveryPanel } from '../components/dashboard/RestaurantDiscoveryPanel'
import { RestaurantMenuPanel } from '../components/dashboard/RestaurantMenuPanel'
import { CheckoutPanel } from '../components/dashboard/CheckoutPanel'
import { SettingsPanel } from '../components/dashboard/settings/SettingsPanel'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout, logoutUser } from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'
import { customerApi } from '../services/customerApi'
import type { CustomerProfile } from '../types/customer'

function Home() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { logoutStatus, refreshToken, user } = useAppSelector((state) => state.auth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const activeView = getDashboardView(location.pathname)
  const activeSettingsSection = getSettingsSection(location.pathname)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileError, setProfileError] = useState('')
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

  async function handleLogout() {
    if (refreshToken) {
      await dispatch(logoutUser({ refreshToken }))
    } else {
      dispatch(logout())
    }

    navigate('/login', { replace: true })
  }

  return (
    <main className="h-screen overflow-hidden bg-background text-content">
      <div
        className={`grid h-full grid-rows-1 transition-[grid-template-columns] duration-200 ${
          isSidebarCollapsed ? 'lg:grid-cols-[6rem_1fr]' : 'lg:grid-cols-[17rem_1fr]'
        }`}
      >
        <DashboardSidebar
          activeSettingsSection={activeSettingsSection}
          activeView={activeView}
          className="hidden lg:flex"
          isCollapsed={isSidebarCollapsed}
          isLoggingOut={isLoggingOut}
          name={name}
          onLogout={handleLogout}
          onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
          userName={user?.name}
        />

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 pb-[calc(4rem+max(env(safe-area-inset-bottom),0.5rem))] pt-5 sm:px-6 lg:px-8 lg:py-5">
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
          {activeView === 'orders' ? (
            <OrdersPanel />
          ) : null}
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
        <div className="grid grid-cols-4 gap-1">
          {[...dashboardNavItems, { icon: Settings, id: 'settings' as const, path: '/settings' }].map(({ icon: Icon, id, path }) => {
            const isActive = activeView === id
            const label = t(`nav.${id}`)

            return (
              <NavLink
                aria-label={label}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-voro-lg px-1 text-[0.7rem] font-bold leading-none transition ${
                  isActive
                    ? 'bg-accent text-content'
                    : 'text-muted-foreground hover:bg-muted hover:text-content'
                }`}
                key={id}
                to={path}
              >
                <Icon className="size-5 shrink-0" />
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </main>
  )
}

export default Home
