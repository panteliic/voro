import { useEffect, useMemo, useRef, useState } from 'react'
import { Banknote, Clock3, CreditCard, KeyRound, MessageCircle, Navigation, Store } from 'lucide-react'
import * as L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { matchPointToRoute, remainingRouteFromMatch, type RoutePoint } from '@voro/shared'
import 'leaflet/dist/leaflet.css'
import { translate, type DriverLanguage } from '../../i18n'
import { getDriverDeliveryRoute } from '../../services/driverApi'
import type { Delivery, DriverRoute } from '../../types/driver'

const driverIcon = L.divIcon({
  className: 'voro-driver-pin',
  html: '<span style="display:grid;height:38px;width:38px;place-items:center;border:3px solid white;border-radius:50%;background:#2c6bed;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:18px">🛵</span>',
  iconAnchor: [19, 19],
  iconSize: [38, 38],
})

const restaurantIcon = L.divIcon({
  className: 'voro-driver-pin',
  html: '<span style="display:grid;height:36px;width:36px;place-items:center;border:3px solid white;border-radius:50%;background:#ef5a35;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:17px">🍽️</span>',
  iconAnchor: [18, 18],
  iconSize: [36, 36],
})

const customerIcon = L.divIcon({
  className: 'voro-driver-pin',
  html: '<span style="display:grid;height:36px;width:36px;place-items:center;border:3px solid white;border-radius:50%;background:#1f9d73;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:17px">🏠</span>',
  iconAnchor: [18, 18],
  iconSize: [36, 36],
})

const statusConfirmationDistanceMeters = 200

function distanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const earthRadius = 6_371_000
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos((first.latitude * Math.PI) / 180) * Math.cos((second.latitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function AnimatedDriverMarker({ position, label }: { position: [number, number]; label: string }) {
  const [displayedPosition, setDisplayedPosition] = useState(position)
  const currentPosition = useRef(position)

  useEffect(() => {
    const startPosition = currentPosition.current
    const hasMoved = startPosition[0] !== position[0] || startPosition[1] !== position[1]

    if (!hasMoved || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentPosition.current = position
      setDisplayedPosition(position)
      return
    }

    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 800)
      const eased = 1 - (1 - progress) ** 2
      const nextPosition: [number, number] = [
        startPosition[0] + (position[0] - startPosition[0]) * eased,
        startPosition[1] + (position[1] - startPosition[1]) * eased,
      ]

      currentPosition.current = nextPosition
      setDisplayedPosition(nextPosition)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [position])

  return <Marker icon={driverIcon} position={displayedPosition}><Popup>{label}</Popup></Marker>
}

function MapViewport({ points, routeKey }: { points: RoutePoint[]; routeKey: string }) {
  const map = useMap()
  const fittedRouteKey = useRef('')

  useEffect(() => {
    if (fittedRouteKey.current === routeKey || points.length < 2) return
    fittedRouteKey.current = routeKey
    map.fitBounds(points, { padding: [36, 36], maxZoom: 16 })
  }, [map, points, routeKey])

  return null
}

function deliveryCopy(delivery: Delivery, language: DriverLanguage) {
  const t = (key: string) => translate(language, key)

  if (delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant') {
    return {
      eyebrow: t('delivery.nextStop'),
      title: t('delivery.pickupTitle'),
      action: t('delivery.pickupAction'),
      nextStatus: 'picked_up' as const,
    }
  }

  if (delivery.status === 'picked_up') {
    return {
      eyebrow: t('delivery.pickedUp'),
      title: t('delivery.toCustomerTitle'),
      action: t('delivery.toCustomerAction'),
      nextStatus: 'on_the_way' as const,
    }
  }

  return {
    eyebrow: t('delivery.onTheWay'),
    title: t('delivery.finishTitle'),
    action: t('delivery.finishAction'),
    nextStatus: 'delivered' as const,
  }
}

export function ActiveDeliveryMap({
  currentLocation,
  delivery,
  language,
  token,
  isUpdating,
  onOpenChat,
  onUpdateStatus,
  onWithdraw,
}: {
  currentLocation: { latitude: number; longitude: number } | null
  delivery: Delivery
  language: DriverLanguage
  token: string
  isUpdating: boolean
  onOpenChat: () => void
  onUpdateStatus: (status: 'picked_up' | 'on_the_way' | 'delivered', proof?: { proofNote: string }) => void
  onWithdraw: () => void
}) {
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const [routeData, setRouteData] = useState<DriverRoute | null>(null)
  const [error, setError] = useState('')
  const [isShowingPickupCode, setIsShowingPickupCode] = useState(false)
  const [deliveryProofNote, setDeliveryProofNote] = useState('')
  const loadRouteRef = useRef<() => void>(() => undefined)
  const rerouteStateRef = useRef({ offRouteSamples: 0, lastRerouteAt: 0 })
  const copy = deliveryCopy(delivery, language)
  useEffect(() => {
    let active = true

    const loadRoute = () => {
      void getDriverDeliveryRoute(token, delivery.id)
        .then((nextRoute) => {
          if (active) {
            setRouteData(nextRoute)
            setError('')
          }
        })
        .catch((requestError: unknown) => {
          if (active) {
            setError(requestError instanceof Error ? requestError.message : translate(language, 'delivery.routeUnavailable'))
          }
        })
    }

    loadRouteRef.current = loadRoute
    loadRoute()

    return () => {
      active = false
      loadRouteRef.current = () => undefined
    }
  }, [delivery.id, delivery.status, language, token])

  useEffect(() => {
    if (!currentLocation || !routeData) return

    const match = matchPointToRoute(
      [currentLocation.latitude, currentLocation.longitude],
      routeData.route.coordinates,
    )
    if (match && match.distanceMeters <= 75) {
      rerouteStateRef.current.offRouteSamples = 0
      return
    }

    rerouteStateRef.current.offRouteSamples += 1
    const now = Date.now()
    if (rerouteStateRef.current.offRouteSamples >= 3 && now - rerouteStateRef.current.lastRerouteAt >= 30_000) {
      rerouteStateRef.current.offRouteSamples = 0
      rerouteStateRef.current.lastRerouteAt = now
      loadRouteRef.current()
    }
  }, [currentLocation, routeData])

  const mapTracking = useMemo(() => {
    const rawPosition: RoutePoint | null = currentLocation
      ? [currentLocation.latitude, currentLocation.longitude]
      : routeData
        ? [routeData.currentLocation.latitude, routeData.currentLocation.longitude]
        : null
    if (!rawPosition || !routeData?.route.coordinates.length) {
      return { driverPosition: rawPosition, routePoints: routeData?.route.coordinates || [], etaMinutes: routeData?.route.etaMinutes || null }
    }

    const match = matchPointToRoute(rawPosition, routeData.route.coordinates)
    if (!match || match.distanceMeters > 75) {
      return { driverPosition: rawPosition, routePoints: routeData.route.coordinates, etaMinutes: routeData.route.etaMinutes }
    }

    const remainingRatio = Math.max(0, 1 - match.distanceAlongMeters / Math.max(1, match.totalDistanceMeters))
    return {
      driverPosition: match.position,
      routePoints: remainingRouteFromMatch(routeData.route.coordinates, match),
      etaMinutes: Math.max(1, Math.ceil(routeData.route.etaMinutes * remainingRatio)),
    }
  }, [currentLocation, routeData])

  const points = useMemo<RoutePoint[]>(() => {
    if (mapTracking.routePoints.length) return mapTracking.routePoints

    const staticPoints: RoutePoint[] = [
      [delivery.restaurantLatitude, delivery.restaurantLongitude],
      [delivery.customerLatitude, delivery.customerLongitude],
    ]
    return mapTracking.driverPosition
      ? [mapTracking.driverPosition, ...staticPoints]
      : staticPoints
  }, [delivery, mapTracking])
  const targetIsRestaurant =
    routeData?.destination.type === 'restaurant' ||
    (!routeData && (delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant'))
  const canShowPickupCode = Boolean(delivery.pickupCode) && (delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant')
  const canWithdraw = delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant'
  const driverPosition = mapTracking.driverPosition
  const driverLocation = driverPosition
    ? { latitude: driverPosition[0], longitude: driverPosition[1] }
    : null
  const statusTarget = copy.nextStatus === 'picked_up'
    ? { latitude: delivery.restaurantLatitude, longitude: delivery.restaurantLongitude }
    : copy.nextStatus === 'delivered'
      ? { latitude: delivery.customerLatitude, longitude: delivery.customerLongitude }
      : null
  const statusTargetDistance = driverLocation && statusTarget
    ? distanceMeters(driverLocation, statusTarget)
    : null
  const actionBlockedReason = copy.nextStatus === 'picked_up'
    ? delivery.orderStatus !== 'ready'
      ? t('delivery.waitForRestaurant')
      : statusTargetDistance === null
        ? t('delivery.freshLocationRequired')
        : statusTargetDistance > statusConfirmationDistanceMeters
          ? t('delivery.getCloserToRestaurant')
          : ''
    : copy.nextStatus === 'delivered'
      ? statusTargetDistance === null
        ? t('delivery.freshLocationRequired')
        : statusTargetDistance > statusConfirmationDistanceMeters
          ? t('delivery.getCloserToCustomer')
          : ''
      : ''

  return (
    <section className="relative flex min-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-voro-lg border border-line bg-card">
      <div className="flex flex-col justify-between gap-4 border-b border-line bg-card px-5 py-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-action">{copy.eyebrow}</p>
          <h1 className="mt-1 text-xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('delivery.order', { id: delivery.orderId })} · {delivery.total.toFixed(0)} RSD</p>
        </div>
        {routeData ? (
          <div className="flex gap-2 text-sm font-bold">
            <span className="flex items-center gap-1 rounded-voro-md bg-muted px-3 py-2"><Navigation className="size-4 text-action" />{(routeData.route.distanceMeters / 1000).toFixed(1)} km</span>
            <span className="flex items-center gap-1 rounded-voro-md bg-accent px-3 py-2 text-action"><Clock3 className="size-4" />{mapTracking.etaMinutes || routeData.route.etaMinutes} min</span>
          </div>
        ) : null}
        <button className="inline-flex items-center justify-center gap-2 rounded-voro-md border border-line px-3 py-2 text-sm font-bold text-action hover:bg-accent" onClick={onOpenChat} type="button"><MessageCircle className="size-4" />{t('delivery.chat')}</button>
      </div>

      {canShowPickupCode ? <button className="mx-4 my-4 flex w-[calc(100%-2rem)] items-center justify-between gap-4 rounded-voro-lg bg-action px-5 py-4 text-left text-action-text shadow-voro-sm" onClick={() => setIsShowingPickupCode(true)} type="button">
        <span><span className="block text-xs font-bold uppercase tracking-wide opacity-80">{t('delivery.showRestaurant', { id: delivery.orderId })}</span><strong className="mt-1 block text-lg">{t('delivery.pickupCode')}</strong></span>
        <strong className="text-4xl font-black tracking-[0.08em]">#{delivery.orderId}</strong>
      </button> : null}
      <div className={`mx-4 my-4 flex items-start gap-3 rounded-voro-lg border px-4 py-3 text-sm ${delivery.paymentMethod === 'cash' ? 'border-action/30 bg-accent' : 'border-line bg-background'}`}>
        {delivery.paymentMethod === 'cash' ? <Banknote className="mt-0.5 size-5 shrink-0 text-action" /> : <CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
        <div>
          <p className="font-bold text-content">{delivery.paymentMethod === 'cash' ? t('payment.cash') : t('payment.card')}</p>
          {delivery.paymentMethod === 'cash' ? (
            <p className="mt-1 text-muted-foreground">
              {t('payment.collectCash', { amount: delivery.total.toFixed(0) })}
              {delivery.changeDue > 0 ? ` · ${t('payment.changeDue', { amount: delivery.changeDue.toFixed(0) })}` : ''}
            </p>
          ) : null}
        </div>
      </div>
      {error ? <p className="px-5 py-3 text-sm text-destructive">{error}</p> : null}
      <MapContainer center={points[0]} className="min-h-0 flex-1 w-full" scrollWheelZoom zoom={14}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeData ? <Polyline color="#ef5a35" pathOptions={{ opacity: 0.9, weight: 6 }} positions={mapTracking.routePoints} /> : null}
        {driverPosition ? <AnimatedDriverMarker label={t('delivery.currentLocation')} position={driverPosition} /> : null}
        <Marker icon={restaurantIcon} position={[delivery.restaurantLatitude, delivery.restaurantLongitude]}>
          <Popup><strong>{delivery.restaurantName}</strong><br />{t('delivery.pickup')}</Popup>
        </Marker>
        <Marker icon={customerIcon} position={[delivery.customerLatitude, delivery.customerLongitude]}>
          <Popup><strong>{delivery.customerName}</strong><br />{t('delivery.dropoff')}</Popup>
        </Marker>
        <MapViewport points={points} routeKey={`${delivery.id}:${delivery.status}:${routeData?.route.coordinates.length || 0}:${routeData?.route.coordinates[0]?.join(',') || ''}`} />
      </MapContainer>

      <div className="grid gap-3 border-t border-line bg-card p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-2 font-bold"><Store className="size-4 text-action" />{targetIsRestaurant ? delivery.restaurantName : delivery.customerName}</p>
          <p className="mt-1 truncate text-muted-foreground">{targetIsRestaurant ? delivery.restaurantAddress : delivery.customerAddress}</p>
          {actionBlockedReason ? <p className="mt-2 text-xs font-medium text-destructive">{actionBlockedReason}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-voro-md border border-line px-4 py-3 text-sm font-bold text-action hover:bg-accent" href={`https://www.google.com/maps/dir/?api=1&destination=${targetIsRestaurant ? delivery.restaurantLatitude : delivery.customerLatitude},${targetIsRestaurant ? delivery.restaurantLongitude : delivery.customerLongitude}`} rel="noreferrer" target="_blank"><Navigation className="mr-2 inline size-4" />{t('delivery.navigate')}</a>
          {canWithdraw ? <button className="rounded-voro-md border border-destructive/40 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60" disabled={isUpdating} onClick={onWithdraw} type="button">{t('delivery.withdraw')}</button> : null}
          {canShowPickupCode ? <button className="rounded-voro-md border border-action bg-accent px-4 py-3 text-sm font-bold text-action" onClick={() => setIsShowingPickupCode(true)} type="button"><KeyRound className="mr-2 inline size-4" />{t('delivery.showCode')}</button> : null}
          <button
            className="rounded-voro-md bg-action px-5 py-3 text-sm font-bold text-action-text transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdating || Boolean(actionBlockedReason)}
            onClick={() => onUpdateStatus(copy.nextStatus, { proofNote: deliveryProofNote })}
            type="button"
          >
            {isUpdating ? t('delivery.updating') : copy.action}
          </button>
        </div>
      </div>
      {copy.nextStatus === 'delivered' ? <div className="border-t border-line bg-background px-4 py-4"><label className="grid gap-1 text-sm font-bold">{t('delivery.proofNote')}<input className="rounded-voro-md border border-line bg-card px-3 py-2" maxLength={500} onChange={(event) => setDeliveryProofNote(event.target.value)} placeholder={t('delivery.proofNotePlaceholder')} value={deliveryProofNote} /></label></div> : null}
      {isShowingPickupCode ? <div className="fixed inset-0 z-[600] grid place-items-center bg-content/75 p-6" role="dialog" aria-modal="true" aria-label={t('delivery.codeDialog')}>
        <div className="w-full max-w-sm rounded-voro-xl bg-card p-6 text-center shadow-2xl">
          <KeyRound className="mx-auto size-8 text-action" />
          <p className="mt-3 text-sm font-bold text-muted-foreground">{t('delivery.showCodeToRestaurant')}</p>
          <p className="mt-3 text-5xl font-black tracking-[0.12em] text-content">#{delivery.orderId}</p>
          <p className="mt-4 text-sm text-muted-foreground">{t('delivery.order', { id: delivery.orderId })} · {delivery.restaurantName}</p>
          <button className="mt-6 w-full rounded-voro-md bg-action px-4 py-3 text-sm font-bold text-action-text" onClick={() => setIsShowingPickupCode(false)} type="button">{t('common.close')}</button>
        </div>
      </div> : null}
    </section>
  )
}
