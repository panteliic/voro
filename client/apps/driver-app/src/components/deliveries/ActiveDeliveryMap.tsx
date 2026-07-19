import { useEffect, useMemo, useState } from 'react'
import { Clock3, KeyRound, Navigation, Store } from 'lucide-react'
import * as L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
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

function MapViewport({ points }: { points: Array<[number, number]> }) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 16 })
    }
  }, [map, points])

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
  delivery,
  language,
  token,
  locationKey,
  isUpdating,
  onUpdateStatus,
}: {
  delivery: Delivery
  language: DriverLanguage
  token: string
  locationKey: string
  isUpdating: boolean
  onUpdateStatus: (status: 'picked_up' | 'on_the_way' | 'delivered') => void
}) {
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const [routeData, setRouteData] = useState<DriverRoute | null>(null)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isShowingPickupCode, setIsShowingPickupCode] = useState(false)
  const copy = deliveryCopy(delivery, language)
  const shouldShowRoute = delivery.status !== 'picked_up'

  useEffect(() => {
    if (!shouldShowRoute) {
      return
    }

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
            setError(requestError instanceof Error ? requestError.message : t('delivery.routeUnavailable'))
          }
        })
    }

    loadRoute()
    const interval = window.setInterval(() => setRefreshKey((current) => current + 1), 20_000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [delivery.id, delivery.status, language, locationKey, refreshKey, shouldShowRoute, token])

  const points = useMemo<Array<[number, number]>>(() => {
    if (shouldShowRoute && routeData?.route.coordinates.length) {
      return routeData.route.coordinates
    }

    const staticPoints: Array<[number, number]> = [
      [delivery.restaurantLatitude, delivery.restaurantLongitude],
      [delivery.customerLatitude, delivery.customerLongitude],
    ]
    return routeData
      ? [[routeData.currentLocation.latitude, routeData.currentLocation.longitude], ...staticPoints]
      : staticPoints
  }, [delivery, routeData, shouldShowRoute])
  const targetIsRestaurant =
    (shouldShowRoute && routeData?.destination.type === 'restaurant') ||
    (!routeData && (delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant'))
  const canShowPickupCode = Boolean(delivery.pickupCode) && (delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant')

  return (
    <section className="relative overflow-hidden rounded-voro-lg border border-line bg-card">
      <div className="flex flex-col justify-between gap-4 border-b border-line bg-card px-5 py-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-action">{copy.eyebrow}</p>
          <h1 className="mt-1 text-xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('delivery.order', { id: delivery.orderId })} · {delivery.total.toFixed(0)} RSD</p>
        </div>
        {shouldShowRoute && routeData ? (
          <div className="flex gap-2 text-sm font-bold">
            <span className="flex items-center gap-1 rounded-voro-md bg-muted px-3 py-2"><Navigation className="size-4 text-action" />{(routeData.route.distanceMeters / 1000).toFixed(1)} km</span>
            <span className="flex items-center gap-1 rounded-voro-md bg-accent px-3 py-2 text-action"><Clock3 className="size-4" />{routeData.route.etaMinutes} min</span>
          </div>
        ) : null}
      </div>

      {canShowPickupCode ? <button className="mx-4 my-4 flex w-[calc(100%-2rem)] items-center justify-between gap-4 rounded-voro-lg bg-action px-5 py-4 text-left text-action-text shadow-voro-sm" onClick={() => setIsShowingPickupCode(true)} type="button">
        <span><span className="block text-xs font-bold uppercase tracking-wide opacity-80">{t('delivery.showRestaurant', { id: delivery.orderId })}</span><strong className="mt-1 block text-lg">{t('delivery.pickupCode')}</strong></span>
        <strong className="text-4xl font-black tracking-[0.08em]">#{delivery.orderId}</strong>
      </button> : null}
      {shouldShowRoute && error ? <p className="px-5 py-3 text-sm text-destructive">{error}</p> : null}
      {!shouldShowRoute ? <p className="border-b border-line px-5 py-3 text-sm text-muted-foreground">{t('delivery.routeAfterPickup')}</p> : null}
      <MapContainer center={points[0]} className="h-[22rem] w-full sm:h-[24rem]" scrollWheelZoom zoom={14}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {shouldShowRoute && routeData ? <Polyline color="#ef5a35" pathOptions={{ opacity: 0.9, weight: 6 }} positions={routeData.route.coordinates} /> : null}
        {routeData ? (
          <Marker icon={driverIcon} position={[routeData.currentLocation.latitude, routeData.currentLocation.longitude]}>
            <Popup>{t('delivery.currentLocation')}</Popup>
          </Marker>
        ) : null}
        <Marker icon={restaurantIcon} position={[delivery.restaurantLatitude, delivery.restaurantLongitude]}>
          <Popup><strong>{delivery.restaurantName}</strong><br />{t('delivery.pickup')}</Popup>
        </Marker>
        <Marker icon={customerIcon} position={[delivery.customerLatitude, delivery.customerLongitude]}>
          <Popup><strong>{delivery.customerName}</strong><br />{t('delivery.dropoff')}</Popup>
        </Marker>
        <MapViewport points={points} />
      </MapContainer>

      <div className="grid gap-3 border-t border-line bg-card p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-2 font-bold"><Store className="size-4 text-action" />{targetIsRestaurant ? delivery.restaurantName : delivery.customerName}</p>
          <p className="mt-1 truncate text-muted-foreground">{targetIsRestaurant ? delivery.restaurantAddress : delivery.customerAddress}</p>
        </div>
        <div className="flex gap-2">
          {canShowPickupCode ? <button className="rounded-voro-md border border-action bg-accent px-4 py-3 text-sm font-bold text-action" onClick={() => setIsShowingPickupCode(true)} type="button"><KeyRound className="mr-2 inline size-4" />{t('delivery.showCode')}</button> : null}
          <button
            className="rounded-voro-md bg-action px-5 py-3 text-sm font-bold text-action-text transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(copy.nextStatus)}
            type="button"
          >
            {isUpdating ? t('delivery.updating') : copy.action}
          </button>
        </div>
      </div>
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
