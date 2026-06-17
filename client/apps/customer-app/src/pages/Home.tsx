import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@voro/ui'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'
import {
  getDashboardView,
  getSettingsSection,
  getInitials,
} from '../components/dashboard/utils/dashboardUtils'
import { dashboardNavItems } from '../components/dashboard/data/dashboardData'
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
  const activeView = getDashboardView(location.pathname)
  const activeSettingsSection = getSettingsSection(location.pathname)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileError, setProfileError] = useState('')
  const name = user?.name || 'korisnice'
  const displayName = profile?.user.name || user?.name || name
  const displayEmail = profile?.user.email || user?.email || ''
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
        className={`grid h-full grid-rows-[auto_1fr] transition-[grid-template-columns] duration-200 lg:grid-rows-1 ${
          isSidebarCollapsed ? 'lg:grid-cols-[6rem_1fr]' : 'lg:grid-cols-[17rem_1fr]'
        }`}
      >
        <header className="flex h-16 items-center justify-between border-b border-line bg-card px-4 sm:px-6 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.svg" alt="Voro" className="h-9 w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-content">{t('sidebar.appName')}</p>
              <p className="hidden truncate text-xs text-muted-foreground min-[380px]:block">
                {t('sidebar.workspace')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={t('sidebar.account')}
                className="ml-3 rounded-full p-0"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Avatar>
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-bold text-content">
                  {displayName}
                </span>
                {displayEmail ? (
                  <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">
                    {displayEmail}
                  </span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink className="cursor-pointer gap-2" to="/settings">
                  <Settings className="size-4" />
                  {t('nav.settings')}
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink className="cursor-pointer gap-2" to="/settings/account">
                  <UserRound className="size-4" />
                  {t('sidebar.account')}
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={isLoggingOut}
                onSelect={(event) => {
                  event.preventDefault()
                  void handleLogout()
                }}
                variant="destructive"
              >
                <LogOut className="size-4" />
                {isLoggingOut ? t('common.loggingOut') : t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:py-5">
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

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {dashboardNavItems.map(({ icon: Icon, id, path }) => {
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
