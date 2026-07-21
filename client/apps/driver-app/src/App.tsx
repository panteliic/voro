import { useEffect, useRef, useState } from 'react'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { acceptDeliveryOffer, declineDeliveryOffer, getDriverDashboard, updateDeliveryStatus, updateDriverPresence, withdrawFromDelivery } from './services/driverApi'
import { revokeSession, SessionExpiredError } from './services/apiClient'
import { loginDriver, setupDriverPassword } from './services/authApi'
import type { AuthUser, LoginPayload, SetupPasswordPayload } from './types/auth'
import type { DashboardResponse } from './types/driver'
import { clearSession, storedToken, storedUser, storeSession } from './utils/storage'
import { translate, type DriverLanguage } from './i18n'

type Position = { latitude: number; longitude: number }

const domacePalacinkeDemoPosition: Position = { latitude: 44.8144, longitude: 20.4399 }
const locationFreshForMs = 45_000
const presenceHeartbeatMs = 15_000

function canUseLocalDemoLocation() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

function driverTranslation(key: string) {
  const language: DriverLanguage = localStorage.getItem('voro-driver-language') === 'en' ? 'en' : 'sr'
  return translate(language, key)
}

function distanceMeters(first: Position, second: Position) {
  const earthRadius = 6_371_000
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos((first.latitude * Math.PI) / 180) * Math.cos((second.latitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function App() {
  const [token, setToken] = useState(storedToken)
  const [user, setUser] = useState<AuthUser | null>(storedUser)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [isDemoLocation, setIsDemoLocation] = useState(() => canUseLocalDemoLocation() && localStorage.getItem('voro-driver-demo-location') === 'true')
  const onlineRef = useRef(false)
  const wantsOnlineRef = useRef(true)
  const positionRef = useRef<Position | null>(null)
  const isDemoLocationRef = useRef(isDemoLocation)
  const lastLocationAtRef = useRef(0)
  const lastSentPosition = useRef<Position | null>(null)
  const lastPresenceSentAt = useRef(0)

  function endSession(message = '') {
    clearSession()
    setToken('')
    setUser(null)
    setDashboard(null)
    setPosition(null)
    onlineRef.current = false
    wantsOnlineRef.current = false
    positionRef.current = null
    lastLocationAtRef.current = 0
    lastSentPosition.current = null
    lastPresenceSentAt.current = 0
    setStatus(message)
  }

  function handleError(error: unknown, fallback: string) {
    if (error instanceof SessionExpiredError) {
      endSession(error.message)
      return
    }

    setStatus(error instanceof Error ? error.message : fallback)
  }

  async function loadDashboard(nextToken = token, silently = false) {
    if (!nextToken) return

    if (!silently) {
      setIsLoading(true)
      setStatus('')
    }

    try {
      setDashboard(await getDriverDashboard(nextToken))
    } catch (error) {
      if (!silently || error instanceof SessionExpiredError) {
        handleError(error, 'Podaci o dostavljaču nisu mogli da se učitaju.')
      }
    } finally {
      if (!silently) setIsLoading(false)
    }
  }

  async function publishPresence(isOnline: boolean, nextPosition: Position | null) {
    if (!token) return

    const response = await updateDriverPresence(token, {
      isOnline,
      ...(nextPosition || {}),
    })
    setDashboard((current) => current ? { ...current, driver: response.driver } : current)
  }

  function hasFreshLocation() {
    return isDemoLocationRef.current || (positionRef.current !== null && Date.now() - lastLocationAtRef.current <= locationFreshForMs)
  }

  useEffect(() => {
    if (!token) return
    let active = true

    if (isDemoLocationRef.current) {
      setPosition(domacePalacinkeDemoPosition)
      positionRef.current = domacePalacinkeDemoPosition
      lastLocationAtRef.current = Date.now()
    }

    const initialSync = window.setTimeout(() => {
      const canStayOnline = wantsOnlineRef.current && hasFreshLocation()
      onlineRef.current = canStayOnline
      const initialPosition = canStayOnline && isDemoLocationRef.current ? domacePalacinkeDemoPosition : canStayOnline ? positionRef.current : null
      void publishPresence(canStayOnline, initialPosition)
        .catch((error) => {
          if (active) handleError(error, 'Status dostavljača nije mogao da se ažurira.')
        })
        .finally(() => {
          if (active) void loadDashboard(token)
        })
    }, 0)

    const refreshInterval = window.setInterval(() => void loadDashboard(token, true), 4_000)
    let watchId: number | null = null

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (nextPosition) => {
          if (isDemoLocationRef.current) return

          const next = { latitude: nextPosition.coords.latitude, longitude: nextPosition.coords.longitude }
          setPosition(next)
          positionRef.current = next
          lastLocationAtRef.current = Date.now()

          if (!onlineRef.current && wantsOnlineRef.current) {
            onlineRef.current = true
          }

          if (!onlineRef.current) return

          const now = Date.now()
          const shouldSend =
            !lastSentPosition.current ||
            distanceMeters(lastSentPosition.current, next) >= 20 ||
            now - lastPresenceSentAt.current >= 10_000

          if (!shouldSend) return

          lastSentPosition.current = next
          lastPresenceSentAt.current = now
          void publishPresence(true, next).catch((error) => {
            if (active) handleError(error, 'Lokacija nije mogla da se pošalje.')
          })
        },
        (locationError) => {
          if (!active) return

          // A watch timeout only means the browser has not produced a new GPS
          // reading yet. It must not immediately make an otherwise fresh
          // courier unable to accept the offer currently shown on screen.
          if (isDemoLocationRef.current) return

          const hasLocationPermission = locationError.code !== GeolocationPositionError.PERMISSION_DENIED
          if (hasLocationPermission && hasFreshLocation()) {
            setStatus(driverTranslation('status.gpsRefreshing'))
            return
          }

          const wasOnline = onlineRef.current
          onlineRef.current = false
          lastLocationAtRef.current = 0
          if (wasOnline) {
            void publishPresence(false, null)
              .then(() => loadDashboard(token, true))
              .catch((error) => handleError(error, 'Status dostavljača nije mogao da se ažurira.'))
          }
          setStatus(driverTranslation('status.locationRequired'))
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: locationFreshForMs },
      )
    }

    const heartbeatInterval = window.setInterval(() => {
      if (!onlineRef.current) return

      if (!hasFreshLocation()) {
        onlineRef.current = false
        void publishPresence(false, null)
          .then(() => loadDashboard(token, true))
          .catch((error) => {
            if (active) handleError(error, 'Status dostavljača nije mogao da se ažurira.')
          })
        if (active) setStatus(driverTranslation('status.locationStale'))
        return
      }

      const heartbeatPosition = isDemoLocationRef.current ? domacePalacinkeDemoPosition : positionRef.current
      void publishPresence(true, heartbeatPosition).catch((error) => {
        if (active) handleError(error, 'Status dostavljača nije mogao da se osveži.')
      })
    }, presenceHeartbeatMs)

    // Mobile browsers can pause timers while the app is in the background.
    // Immediately publish the latest GPS reading when the courier returns so
    // the server does not keep a stale position longer than necessary.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !onlineRef.current || !hasFreshLocation()) return

      const latestPosition = isDemoLocationRef.current ? domacePalacinkeDemoPosition : positionRef.current
      void publishPresence(true, latestPosition).catch((error) => {
        if (active) handleError(error, 'Lokacija nije mogla da se osveži po povratku u aplikaciju.')
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearTimeout(initialSync)
      window.clearInterval(refreshInterval)
      window.clearInterval(heartbeatInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
    // GPS subscription belongs to the authenticated session; callbacks intentionally read the latest refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleLogin(payload: LoginPayload) {
    setIsLoading(true)
    setStatus('')

    try {
      const data = await loginDriver(payload)
      storeSession(data.accessToken, data.refreshToken, data.user)
      onlineRef.current = false
      wantsOnlineRef.current = true
      lastLocationAtRef.current = 0
      setToken(data.accessToken)
      setUser(data.user)
    } catch (error) {
      handleError(error, driverTranslation('status.signInFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetupPassword(payload: SetupPasswordPayload) {
    setIsSettingPassword(true)
    setStatus('')

    try {
      await setupDriverPassword(payload)
      setStatus(driverTranslation('status.passwordCreated'))
    } catch (error) {
      handleError(error, driverTranslation('status.setupFailed'))
    } finally {
      setIsSettingPassword(false)
    }
  }

  async function handleSetOnline(isOnline: boolean) {
    setStatus('')

    if (!isOnline && dashboard?.activeDelivery) {
      setStatus(driverTranslation('status.activeDeliveryOnline'))
      return
    }

    if (isOnline && !hasFreshLocation()) {
      wantsOnlineRef.current = true
      onlineRef.current = false
      try {
        await publishPresence(false, null)
        await loadDashboard(token, true)
      } catch (error) {
        handleError(error, driverTranslation('status.presenceFailed'))
        return
      }
      setStatus(driverTranslation('status.waitForGps'))
      return
    }

    wantsOnlineRef.current = isOnline
    onlineRef.current = isOnline

    try {
      await publishPresence(isOnline, isOnline ? (isDemoLocationRef.current ? domacePalacinkeDemoPosition : positionRef.current) : null)
      await loadDashboard(token, true)
    } catch (error) {
      onlineRef.current = !isOnline
      wantsOnlineRef.current = !isOnline
      handleError(error, driverTranslation('status.presenceFailed'))
    }
  }

  async function handleAcceptOffer(offerId: number) {
    setIsAccepting(true)
    setStatus('')

    try {
      if (!onlineRef.current || !hasFreshLocation()) {
        throw new Error(driverTranslation('status.acceptGpsRequired'))
      }

      // Refresh presence immediately before accepting. This removes the race
      // between the 15-second heartbeat and the server-side 45-second cutoff.
      await publishPresence(true, isDemoLocationRef.current ? domacePalacinkeDemoPosition : positionRef.current)
      await acceptDeliveryOffer(token, offerId)
      setStatus(driverTranslation('status.accepted'))
      await loadDashboard(token, true)
    } catch (error) {
      handleError(error, driverTranslation('status.offerUnavailable'))
      await loadDashboard(token, true)
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleDeclineOffer(offerId: number) {
    setIsAccepting(true)
    setStatus('')

    try {
      await declineDeliveryOffer(token, offerId)
      setStatus(driverTranslation('status.declined'))
      await loadDashboard(token, true)
    } catch (error) {
      handleError(error, driverTranslation('status.offerUnavailable'))
      await loadDashboard(token, true)
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleUpdateDelivery(statusValue: 'picked_up' | 'on_the_way' | 'delivered') {
    const delivery = dashboard?.activeDelivery
    if (!delivery) return

    setIsUpdatingDelivery(true)
    setStatus('')

    try {
      await updateDeliveryStatus(token, delivery.id, statusValue)
      setStatus(driverTranslation(statusValue === 'delivered' ? 'status.deliveryCompleted' : 'status.deliveryUpdated'))
      await loadDashboard(token, true)
    } catch (error) {
      handleError(error, driverTranslation('status.deliveryUpdateFailed'))
    } finally {
      setIsUpdatingDelivery(false)
    }
  }

  async function handleWithdrawFromDelivery() {
    const delivery = dashboard?.activeDelivery
    if (!delivery) return

    const reason = window.prompt(driverTranslation('status.withdrawPrompt'))
    if (reason === null) return

    setIsUpdatingDelivery(true)
    setStatus('')
    try {
      await withdrawFromDelivery(token, delivery.id, reason)
      setStatus(driverTranslation('status.withdrawn'))
      await loadDashboard(token, true)
    } catch (error) {
      handleError(error, driverTranslation('status.withdrawError'))
    } finally {
      setIsUpdatingDelivery(false)
    }
  }

  async function handleLogout() {
    onlineRef.current = false
    wantsOnlineRef.current = false
    try {
      if (token) await publishPresence(false, null)
      await revokeSession()
    } finally {
      endSession()
    }
  }

  async function handleDemoLocationChange(enabled: boolean) {
    if (!canUseLocalDemoLocation()) return

    isDemoLocationRef.current = enabled
    setIsDemoLocation(enabled)
    localStorage.setItem('voro-driver-demo-location', String(enabled))

    const nextPosition = enabled ? domacePalacinkeDemoPosition : null
    setPosition(nextPosition)
    positionRef.current = nextPosition
    lastLocationAtRef.current = enabled ? Date.now() : 0
    lastSentPosition.current = nextPosition
    lastPresenceSentAt.current = 0
    setStatus('')

    try {
      const canStayOnline = enabled && wantsOnlineRef.current
      onlineRef.current = canStayOnline
      await publishPresence(canStayOnline, canStayOnline ? nextPosition : null)
      await loadDashboard(token, true)
      setStatus(enabled ? 'Test lokacija je postavljena pored Domaćih palačinki.' : 'Test lokacija je isključena. Uključi GPS da bi ponovo bio online.')
    } catch (error) {
      handleError(error, 'Test lokacija nije mogla da se postavi.')
    }
  }

  if (!token || !user) {
    return <AuthPage isLoading={isLoading} isSettingPassword={isSettingPassword} onClearStatus={() => setStatus('')} onLogin={handleLogin} onSetupPassword={handleSetupPassword} status={status} />
  }

  const locationKey = position ? `${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}` : ''

  return (
    <DashboardPage
      dashboard={dashboard}
      isAccepting={isAccepting}
      isLoading={isLoading}
      isDemoLocation={isDemoLocation}
      isUpdatingDelivery={isUpdatingDelivery}
      locationKey={locationKey}
      onAcceptOffer={(offerId) => void handleAcceptOffer(offerId)}
      onDeclineOffer={(offerId) => void handleDeclineOffer(offerId)}
      onDemoLocationChange={(enabled) => void handleDemoLocationChange(enabled)}
      onLogout={() => void handleLogout()}
      onRefresh={() => void loadDashboard()}
      onSetOnline={(isOnline) => void handleSetOnline(isOnline)}
      onUpdateDelivery={(statusValue) => void handleUpdateDelivery(statusValue)}
      onWithdrawFromDelivery={() => void handleWithdrawFromDelivery()}
      status={status}
      showDemoLocation={canUseLocalDemoLocation()}
      token={token}
      user={user}
    />
  )
}

export default App
