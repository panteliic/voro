import { useEffect, useState } from 'react'
import { Bike, Clock3 } from 'lucide-react'
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

const courierIcon = L.divIcon({
  className: 'voro-route-pin',
  html: '<span style="display:grid;height:38px;width:38px;place-items:center;border:3px solid white;border-radius:50%;background:#2c6bed;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:18px">🛵</span>',
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

export function OrderRouteMap({
  orderId,
  estimatedDeliveryRange,
}: {
  orderId: number
  estimatedDeliveryRange: { min: number; max: number } | null
}) {
  const { t } = useI18n()
  const [routeData, setRouteData] = useState<CustomerOrderRoute | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const load = () => {
      void customerApi
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
    }

    load()
    const interval = window.setInterval(load, 10_000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [orderId, t])

  if (error) {
    return <div className="-mx-4 grid h-full min-h-0 place-items-center border-y border-dashed border-line px-4 py-3 text-sm text-muted-foreground sm:-mx-6 lg:-mx-8">{error}</div>
  }

  if (!routeData) {
    return <div className="-mx-4 grid h-full min-h-0 place-items-center border-y border-line bg-muted px-4 text-sm font-medium text-muted-foreground sm:-mx-6 lg:-mx-8">{t('map.loadingTracking')}</div>
  }

  const courierPosition: [number, number] | null =
    routeData.courier?.latitude !== null && routeData.courier?.latitude !== undefined &&
    routeData.courier?.longitude !== null && routeData.courier?.longitude !== undefined
      ? [routeData.courier.latitude, routeData.courier.longitude]
      : null
  const endpoints: Array<[number, number]> = [
    [routeData.restaurant.latitude, routeData.restaurant.longitude],
    [routeData.delivery.latitude, routeData.delivery.longitude],
  ]
  const routePoints = routeData.route?.coordinates || []
  const mapPoints = routePoints.length > 1 ? routePoints : [...endpoints, ...(courierPosition ? [courierPosition] : [])]
  const courierOnWay = routeData.deliveryStatus === 'on_the_way' && Boolean(routeData.route)
  const deliveryRange = courierOnWay && routeData.route ? routeData.route.etaRange : estimatedDeliveryRange
  const courierLabel = routeData.courier?.name || t('orders.findingDriver')
  const courierStatus = courierOnWay
    ? t('map.courierOnTheWay')
    : routeData.courier
      ? t('map.courierToRestaurant')
      : null

  return (
    <section className="-mx-4 flex h-full min-h-0 flex-col overflow-hidden bg-background sm:-mx-6 lg:-mx-8">
      <div className="grid shrink-0 gap-2 border-b border-line px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="size-4 shrink-0 text-action" />
          <span className="text-muted-foreground">{t('orders.estimatedDelivery')}:</span>
          <strong className="truncate text-content">{deliveryRange ? t('orders.estimatedRange', deliveryRange) : '—'}</strong>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Bike className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <strong className="truncate text-content">{courierLabel}</strong>
          {courierStatus ? <span className="truncate text-xs text-muted-foreground">· {courierStatus}</span> : null}
        </div>
      </div>

      <MapContainer center={courierPosition || endpoints[0]} className="min-h-0 flex-1 w-full" scrollWheelZoom={false} zoom={13}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {courierOnWay && routePoints.length > 1 ? <Polyline color="#ef5a35" pathOptions={{ opacity: 0.88, weight: 5 }} positions={routePoints} /> : null}
        <Marker icon={restaurantIcon} position={endpoints[0]}><Popup><strong>{routeData.restaurant.name}</strong><br />{t('map.restaurantPin')}</Popup></Marker>
        <Marker icon={deliveryIcon} position={endpoints[1]}><Popup><strong>{routeData.delivery.address || t('map.deliveryPin')}</strong><br />{t('map.deliveryPin')}</Popup></Marker>
        {courierPosition ? <Marker icon={courierIcon} position={courierPosition}><Popup><strong>{routeData.courier?.name}</strong><br />{t('map.courierPin')}</Popup></Marker> : null}
        <MapViewport points={mapPoints} />
      </MapContainer>
    </section>
  )
}
