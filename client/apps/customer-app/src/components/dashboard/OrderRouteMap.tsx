import { useEffect, useMemo, useState } from 'react'
import { MapPinned, Navigation, Store } from 'lucide-react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrderRoute } from '../../types/customer'

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

function MapViewport({ points }: { points: Array<[number, number]> }) {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(points, { padding: [36, 36], maxZoom: 15 })
  }, [map, points])

  return null
}

export function OrderRouteMap({ orderId }: { orderId: number }) {
  const { language, t } = useI18n()
  const [routeData, setRouteData] = useState<CustomerOrderRoute | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    customerApi
      .getOrderRoute(orderId)
      .then((result) => {
        if (isMounted) {
          setRouteData(result)
          setError('')
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('map.routeError'))
        }
      })

    return () => {
      isMounted = false
    }
  }, [orderId, t])

  const number = useMemo(
    () => new Intl.NumberFormat(language === 'sr' ? 'sr-RS' : 'en-US', { maximumFractionDigits: 1 }),
    [language],
  )

  if (error) {
    return (
      <div className="mt-4 rounded-voro-lg border border-dashed border-line px-4 py-3 text-sm text-muted-foreground">
        {error}
      </div>
    )
  }

  if (!routeData) {
    return (
      <div className="mt-4 grid h-64 place-items-center rounded-voro-lg border border-line bg-muted px-4 text-sm font-medium text-muted-foreground">
        {t('map.loadingRoute')}
      </div>
    )
  }

  const routePoints = routeData.route.coordinates
  const endpoints: Array<[number, number]> = [
    [routeData.restaurant.latitude, routeData.restaurant.longitude],
    [routeData.delivery.latitude, routeData.delivery.longitude],
  ]
  const boundsPoints = routePoints.length > 1 ? routePoints : endpoints

  return (
    <section className="mt-4 overflow-hidden rounded-voro-xl border border-line bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPinned className="size-4 text-action" />
          <p className="text-sm font-bold text-content">{t('map.deliveryRoute')}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
          <span>{number.format(routeData.route.distanceMeters / 1000)} km</span>
          <span className="rounded-voro-md bg-accent px-2 py-1 text-action">
            {t('map.travelTime', routeData.route.etaRange)}
          </span>
        </div>
      </div>

      <MapContainer
        center={endpoints[0]}
        className="h-72 w-full"
        scrollWheelZoom={false}
        zoom={13}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline color="#ef5a35" pathOptions={{ opacity: 0.88, weight: 5 }} positions={routePoints} />
        <Marker icon={restaurantIcon} position={endpoints[0]}>
          <Popup>
            <strong>{routeData.restaurant.name}</strong>
            <br />
            {t('map.restaurantPin')}
          </Popup>
        </Marker>
        <Marker icon={deliveryIcon} position={endpoints[1]}>
          <Popup>
            <strong>{routeData.delivery.address || t('map.deliveryPin')}</strong>
            <br />
            {t('map.deliveryPin')}
          </Popup>
        </Marker>
        <MapViewport points={boundsPoints} />
      </MapContainer>

      <div className="grid gap-2 border-t border-line bg-card px-4 py-3 text-sm text-muted-foreground sm:grid-cols-2">
        <span className="flex min-w-0 items-center gap-2">
          <Store className="size-4 shrink-0 text-action" />
          <span className="truncate">{routeData.restaurant.name}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2 sm:justify-end">
          <Navigation className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">{routeData.delivery.address || t('map.deliveryPin')}</span>
        </span>
      </div>
    </section>
  )
}
