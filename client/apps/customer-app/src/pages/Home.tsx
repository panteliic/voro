import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@voro/ui'
import { Menu } from 'lucide-react'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'
import {
  getDashboardView,
  getSettingsSection,
} from '../components/dashboard/utils/dashboardUtils'
import { OverviewPanel } from '../components/dashboard/OverviewPanel'
import { PlaceholderPanel } from '../components/dashboard/PlaceholderPanel'
import { SettingsPanel } from '../components/dashboard/settings/SettingsPanel'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout, logoutUser } from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'
import { customerApi } from '../services/customerApi'
import type { CustomerProfile } from '../types/customer'

const dashboardTitleKeys = {
  overview: 'nav.dashboard',
  orders: 'nav.orders',
  addresses: 'nav.addresses',
  payments: 'nav.payments',
  settings: 'nav.settings',
} as const

function Home() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { logoutStatus, refreshToken, user } = useAppSelector((state) => state.auth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const activeView = getDashboardView(location.pathname)
  const activeSettingsSection = getSettingsSection(location.pathname)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileError, setProfileError] = useState('')
  const name = user?.name || 'korisnice'
  const isLoggingOut = logoutStatus === 'loading'

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [location.pathname])

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
      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label={t('sidebar.close')}
            className="absolute inset-0 cursor-pointer bg-background/70 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
          <DashboardSidebar
            activeSettingsSection={activeSettingsSection}
            activeView={activeView}
            className="relative w-[17rem] shadow-voro-lg"
            isCollapsed={false}
            isLoggingOut={isLoggingOut}
            name={name}
            onLogout={handleLogout}
            onNavigate={() => setIsMobileSidebarOpen(false)}
            onToggleCollapsed={() => setIsMobileSidebarOpen(false)}
            userName={user?.name}
          />
        </div>
      ) : null}

      <div
        className={`grid h-full grid-rows-[auto_1fr] transition-[grid-template-columns] duration-200 lg:grid-rows-1 ${
          isSidebarCollapsed ? 'lg:grid-cols-[6rem_1fr]' : 'lg:grid-cols-[17rem_1fr]'
        }`}
      >
        <header className="flex h-16 items-center justify-between border-b border-line bg-card px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Voro" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-sm font-bold text-content">{t('sidebar.appName')}</span>
          </div>
          <Button
            aria-label={t('sidebar.open')}
            onClick={() => setIsMobileSidebarOpen(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Menu className="size-5" />
          </Button>
        </header>

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

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {activeView === 'settings' ? (
            <div className="hidden lg:block">
              <DashboardHeader title={t(dashboardTitleKeys[activeView])} />
            </div>
          ) : (
            <DashboardHeader title={t(dashboardTitleKeys[activeView])} />
          )}

          {profileError ? (
            <div className="mb-5 rounded-voro-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {profileError}
            </div>
          ) : null}

          {activeView === 'overview' ? (
            <OverviewPanel
              addressCount={profile?.addresses.length ?? 0}
              name={profile?.user.name || name}
              paymentMethodCount={profile?.paymentMethods.length ?? 0}
            />
          ) : null}
          {activeView === 'orders' ? (
            <PlaceholderPanel
              title={t('nav.orders')}
              description={t('placeholder.orders')}
            />
          ) : null}
          {activeView === 'addresses' ? (
            <PlaceholderPanel
              title={t('nav.addresses')}
              description={t('placeholder.addresses')}
            />
          ) : null}
          {activeView === 'payments' ? (
            <PlaceholderPanel
              title={t('nav.payments')}
              description={t('placeholder.payments')}
            />
          ) : null}
          {activeView === 'settings' ? (
            <SettingsPanel
              activeSection={activeSettingsSection}
              profile={profile}
              setProfile={setProfile}
            />
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default Home
