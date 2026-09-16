import { useEffect, useMemo, useRef, useState } from 'react'
import { Bike, Clock3, MessageCircle } from 'lucide-react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { matchPointToRoute, remainingRouteFromMatch, type RoutePoint } from '@voro/shared'
import { createSocketClient } from '@voro/socket'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrderRoute, CustomerOrderTracking } from '../../types/customer'
import { OrderChatModal } from './OrderChatModal'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const cartoBasemapKey = import.meta.env.VITE_CARTO_BASEMAP_KEY?.trim()
const cartoTileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoBasemapKey ? `?key=${encodeURIComponent(cartoBasemapKey)}` : ''}`
const rerouteAfterOffRouteSamples = 3
const rerouteCooldownMs = 30_000

const restaurantIcon = L.divIcon({
  className: 'voro-route-pin',
  html: '<span style="display:grid;height:38px;width:38px;place-items:center;border:3px solid white;border-radius:50%;background:#ef5a35;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:18px">🍽️</span>',
  iconAnchor: [19, 19],
  iconSize: [38, 38],
})

const deliveryIcon = L.divIcon({
  className: 'voro-route-pin',
  html: '<span style="display:grid;height:38px;width:38px;place-items:center;border:3px solid white;border-radius:50%;background:#1f9d73;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:18px">🏠</span>',
  iconAnchor: [19, 19],
  iconSize: [38, 38],
})

const courierIcon = L.divIcon({
  className: 'voro-route-pin',
  html: '<span style="display:grid;height:38px;width:38px;place-items:center;border:3px solid white;border-radius:50%;background:#2c6bed;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:18px">🛵</span>',
  iconAnchor: [19, 19],
  iconSize: [38, 38],
})

function MapViewport({ points, routeKey }: { points: RoutePoint[]; routeKey: string }) {
  const map = useMap()
  const fittedRouteKey = useRef('')

  useEffect(() => {
    if (fittedRouteKey.current === routeKey || points.length < 2) return
    fittedRouteKey.current = routeKey
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, points, routeKey])

  return null
}

function AnimatedCourierMarker({
  targetPosition,
  courierName,
  courierLabel,
}: {
  targetPosition: RoutePoint
  courierName: string
  courierLabel: string
}) {
  const [position, setPosition] = useState(targetPosition)
  const currentPosition = useRef(targetPosition)

  useEffect(() => {
    const startPosition = currentPosition.current
    const hasMoved = startPosition[0] !== targetPosition[0] || startPosition[1] !== targetPosition[1]
    if (!hasMoved || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentPosition.current = targetPosition
      setPosition(targetPosition)
      return
    }

    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 900)
      const eased = 1 - (1 - progress) ** 2
      const nextPosition: RoutePoint = [
        startPosition[0] + (targetPosition[0] - startPosition[0]) * eased,
        startPosition[1] + (targetPosition[1] - startPosition[1]) * eased,
      ]
      currentPosition.current = nextPosition
      setPosition(nextPosition)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [targetPosition])

  return <Marker icon={courierIcon} position={position}><Popup><strong>{courierName}</strong><br />{courierLabel}</Popup></Marker>
}

function routeKeyFor(routeData: CustomerOrderRoute) {
  const route = routeData.route
  if (!route) return `${routeData.orderId}:${routeData.deliveryStatus}:no-route`
  const first = route.coordinates[0]
  const last = route.coordinates[route.coordinates.length - 1]
  return `${routeData.orderId}:${routeData.deliveryStatus}:${route.coordinates.length}:${first?.join(',')}:${last?.join(',')}`
}

export function OrderRouteMap({
  orderId,
  estimatedDeliveryRange,
  fillAvailableHeight = false,
  allowCancel = false,
  onCancel,
}: {
  orderId: number
  estimatedDeliveryRange: { min: number; max: number } | null
  fillAvailableHeight?: boolean
  allowCancel?: boolean
  onCancel?: () => void
}) {
  const { t } = useI18n()
  const [routeData, setRouteData] = useState<CustomerOrderRoute | null>(null)
  const [error, setError] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [trackingNow, setTrackingNow] = useState(Date.now())
  const routeDataRef = useRef<CustomerOrderRoute | null>(null)
  const loadRouteRef = useRef<() => void>(() => undefined)
  const trackingStateRef = useRef({ offRouteSamples: 0, lastRerouteAt: 0, lastSampleKey: '' })

  useEffect(() => {
    routeDataRef.current = routeData
  }, [routeData])

  useEffect(() => {
    const interval = window.setInterval(() => setTrackingNow(Date.now()), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadRoute = () => {
      void customerApi
        .getOrderRoute(orderId)
        .then((result) => {
          if (!isMounted) return
          trackingStateRef.current.offRouteSamples = 0
          setRouteData(result)
          setError('')
        })
        .catch((requestError: unknown) => {
          if (isMounted) setError(requestError instanceof Error ? requestError.message : t('map.routeError'))
        })
    }

    loadRouteRef.current = loadRoute
    loadRoute()
    return () => {
      isMounted = false
      loadRouteRef.current = () => undefined
    }
  }, [orderId, t])

  useEffect(() => {
    let isMounted = true
    let isSocketConnected = false

    const requestRerouteIfNeeded = (tracking: CustomerOrderTracking) => {
      if (tracking.deliveryStatus !== 'on_the_way' || !tracking.courier || tracking.courier.isStale) return
      if (tracking.courier.latitude === null || tracking.courier.longitude === null) return

      const current = routeDataRef.current
      const sampleKey = tracking.courier.recordedAt || `${tracking.courier.latitude},${tracking.courier.longitude}`
      if (trackingStateRef.current.lastSampleKey === sampleKey) return
      trackingStateRef.current.lastSampleKey = sampleKey

      if (!current?.route || current.deliveryStatus !== 'on_the_way') {
        trackingStateRef.current.lastRerouteAt = Date.now()
        loadRouteRef.current()
        return
      }

      const match = matchPointToRoute([tracking.courier.latitude, tracking.courier.longitude], current.route.coordinates)
      const snapThresholdMeters = Math.max(35, Math.min(105, (tracking.courier.accuracyMeters || 30) + 25))
      if (match && match.distanceMeters <= snapThresholdMeters) {
        trackingStateRef.current.offRouteSamples = 0
        return
      }

      trackingStateRef.current.offRouteSamples += 1
      const now = Date.now()
      if (
        trackingStateRef.current.offRouteSamples >= rerouteAfterOffRouteSamples &&
        now - trackingStateRef.current.lastRerouteAt >= rerouteCooldownMs
      ) {
        trackingStateRef.current.lastRerouteAt = now
        loadRouteRef.current()
      }
    }

    const applyTracking = (tracking: CustomerOrderTracking) => {
      if (!isMounted || tracking.orderId !== orderId) return
      const previousStatus = routeDataRef.current?.deliveryStatus
      setRouteData((current) => {
        if (!current) return current
        const sameCourier =
          current.courier?.latitude === tracking.courier?.latitude &&
          current.courier?.longitude === tracking.courier?.longitude &&
          current.courier?.recordedAt === tracking.courier?.recordedAt
        if (sameCourier && current.deliveryStatus === tracking.deliveryStatus) return current
        return { ...current, courier: tracking.courier, deliveryStatus: tracking.deliveryStatus }
      })

      if (previousStatus !== 'on_the_way' && tracking.deliveryStatus === 'on_the_way') {
        trackingStateRef.current.lastRerouteAt = Date.now()
        loadRouteRef.current()
        return
      }
      requestRerouteIfNeeded(tracking)
    }

    const loadFallbackTracking = () => {
      void customerApi.getOrderTracking(orderId).then(applyTracking).catch(() => undefined)
    }

    const token = window.localStorage.getItem('voro_access_token') || ''
    const socket = token ? createSocketClient(SOCKET_URL, { auth: { token } }) : null
    socket?.on('connect', () => {
      isSocketConnected = true
      socket.emit('order:join', { orderId }, (result: { ok: boolean }) => {
        if (!result.ok) isSocketConnected = false
        else loadRouteRef.current()
      })
    })
    socket?.on('disconnect', () => { isSocketConnected = false })
    socket?.on('order:tracking', applyTracking)
    socket?.connect()

    const interval = window.setInterval(() => {
      if (!isSocketConnected) loadFallbackTracking()
    }, 30_000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isSocketConnected) loadRouteRef.current()
        else loadFallbackTracking()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      socket?.disconnect()
    }
  }, [orderId])

  const display = useMemo(() => {
    if (!routeData) return null
    const courier = routeData.courier
    const rawPosition: RoutePoint | null =
      courier?.latitude !== null && courier?.latitude !== undefined &&
      courier?.longitude !== null && courier?.longitude !== undefined
        ? [courier.latitude, courier.longitude]
        : null
    const route = routeData.route
    const courierIsStale = Boolean(
      routeData.deliveryStatus === 'on_the_way' && courier && (
        courier.isStale ||
        !courier.recordedAt ||
        trackingNow - new Date(courier.recordedAt).getTime() > 45_000
      ),
    )
    if (!rawPosition || !route || routeData.deliveryStatus !== 'on_the_way' || courierIsStale) {
      return { courierPosition: rawPosition, routePoints: route?.coordinates || [], etaRange: route?.etaRange || null }
    }

    const match = matchPointToRoute(rawPosition, route.coordinates)
    const snapThresholdMeters = Math.max(35, Math.min(105, (courier?.accuracyMeters || 30) + 25))
    if (!match || match.distanceMeters > snapThresholdMeters) {
      return { courierPosition: rawPosition, routePoints: route.coordinates, etaRange: route.etaRange }
    }

    const remainingRatio = Math.max(0, 1 - match.distanceAlongMeters / Math.max(1, match.totalDistanceMeters))
    const etaMinutes = Math.max(1, Math.ceil(route.etaMinutes * remainingRatio))
    return {
      courierPosition: match.position,
      routePoints: remainingRouteFromMatch(route.coordinates, match),
      etaRange: { min: etaMinutes, max: etaMinutes + Math.max(3, route.etaRange.max - route.etaRange.min) },
    }
  }, [routeData, trackingNow])

  if (error) return <div className="-mx-4 grid h-full min-h-0 place-items-center border-y border-dashed border-line px-4 py-3 text-sm text-muted-foreground sm:-mx-6 lg:-mx-8">{error}</div>
  if (!routeData || !display) return <div className="-mx-4 grid h-full min-h-0 place-items-center border-y border-line bg-muted px-4 text-sm font-medium text-muted-foreground sm:-mx-6 lg:-mx-8">{t('map.loadingTracking')}</div>

  const endpoints: RoutePoint[] = [[routeData.restaurant.latitude, routeData.restaurant.longitude], [routeData.delivery.latitude, routeData.delivery.longitude]]
  const courierIsStale = Boolean(
    routeData.deliveryStatus === 'on_the_way' && routeData.courier && (
      routeData.courier.isStale ||
      !routeData.courier.recordedAt ||
      trackingNow - new Date(routeData.courier.recordedAt).getTime() > 45_000
    ),
  )
  const courierOnWay = routeData.deliveryStatus === 'on_the_way' && Boolean(routeData.route) && !courierIsStale
  const mapPoints = display.routePoints.length > 1 ? display.routePoints : [...endpoints, ...(display.courierPosition ? [display.courierPosition] : [])]
  const deliveryRange = courierOnWay ? display.etaRange : estimatedDeliveryRange
  const courierLabel = routeData.courier?.name || t('orders.findingDriver')
  const courierStatus = courierIsStale
    ? t('map.locationRefreshing')
    : courierOnWay
      ? t('map.courierOnTheWay')
      : routeData.courier
        ? t('map.courierToRestaurant')
        : null
  const routeKey = routeKeyFor(routeData)

  return (
    <section className={fillAvailableHeight ? '-mx-4 flex h-full min-h-0 flex-col overflow-hidden bg-background sm:-mx-6 lg:-mx-8' : 'flex h-96 min-h-0 flex-col overflow-hidden rounded-voro-xl border border-line bg-background sm:h-[26rem]'}>
      <div className="grid shrink-0 gap-2 border-b border-line px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-2"><Clock3 className="size-4 shrink-0 text-action" /><span className="text-muted-foreground">{t('orders.estimatedDelivery')}:</span><strong className="truncate text-content">{deliveryRange ? t('orders.estimatedRange', deliveryRange) : '—'}</strong></div>
        <div className="flex min-w-0 items-center gap-2"><Bike className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><strong className="truncate text-content">{courierLabel}</strong>{courierStatus ? <span className="truncate text-xs text-muted-foreground">· {courierStatus}</span> : null}</div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex w-fit items-center gap-2 rounded-voro-md border border-line px-2.5 py-1.5 text-xs font-bold text-action transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            disabled={!routeData.courier}
            onClick={() => setIsChatOpen(true)}
            title={routeData.courier ? undefined : t('map.waitingForCourier')}
            type="button"
          >
            <MessageCircle className="size-3.5" />
            {routeData.courier ? t('map.messageCourier') : t('map.waitingForCourier')}
          </button>
          {allowCancel ? <button className="inline-flex w-fit items-center gap-2 rounded-voro-md border border-destructive/30 px-2.5 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/10" onClick={onCancel} type="button">{t('map.cancelOrder')}</button> : null}
        </div>
      </div>
      {isChatOpen ? <OrderChatModal onClose={() => setIsChatOpen(false)} orderId={orderId} /> : <MapContainer center={display.courierPosition || endpoints[0]} className="min-h-0 flex-1 w-full" scrollWheelZoom={false} zoom={13}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' url={cartoTileUrl} />
        {courierOnWay && display.routePoints.length > 1 ? <Polyline color="#ef5a35" pathOptions={{ opacity: 0.88, weight: 5 }} positions={display.routePoints} /> : null}
        <Marker icon={restaurantIcon} position={endpoints[0]}><Popup><strong>{routeData.restaurant.name}</strong><br />{t('map.restaurantPin')}</Popup></Marker>
        <Marker icon={deliveryIcon} position={endpoints[1]}><Popup><strong>{routeData.delivery.address || t('map.deliveryPin')}</strong><br />{t('map.deliveryPin')}</Popup></Marker>
        {display.courierPosition ? <AnimatedCourierMarker courierLabel={t('map.courierPin')} courierName={routeData.courier?.name || t('map.courier')} targetPosition={display.courierPosition} /> : null}
        <MapViewport points={mapPoints} routeKey={routeKey} />
      </MapContainer>}
    </section>
  )
}
