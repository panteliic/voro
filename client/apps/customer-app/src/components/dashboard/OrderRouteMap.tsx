import { useEffect, useRef, useState } from 'react'
import { Bike, Clock3, MessageCircle } from 'lucide-react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrderRoute } from '../../types/customer'
import { OrderChatModal } from './OrderChatModal'

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
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [map, points])

  return null
}

function AnimatedCourierMarker({
  targetPosition,
  courierName,
  courierLabel,
}: {
  targetPosition: [number, number]
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

    const durationMs = 750
    const startedAt = performance.now()
    let frame = 0

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const eased = 1 - (1 - progress) ** 2
      const nextPosition: [number, number] = [
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

  return (
    <Marker icon={courierIcon} position={position}>
      <Popup><strong>{courierName}</strong><br />{courierLabel}</Popup>
    </Marker>
  )
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

  useEffect(() => {
    let isMounted = true
    let isRequestInFlight = false

    const loadTracking = () => {
      if (isRequestInFlight) return
      isRequestInFlight = true

      void customerApi
        .getOrderTracking(orderId)
        .then((tracking) => {
          if (!isMounted) return

          setRouteData((current) => {
            if (!current) return current

            const sameCourier =
              current.courier?.name === tracking.courier?.name &&
              current.courier?.latitude === tracking.courier?.latitude &&
              current.courier?.longitude === tracking.courier?.longitude

            if (sameCourier && current.deliveryStatus === tracking.deliveryStatus) {
              return current
            }

            return {
              ...current,
              courier: tracking.courier,
              deliveryStatus: tracking.deliveryStatus,
            }
          })
        })
        .catch(() => undefined)
        .finally(() => {
          isRequestInFlight = false
        })
    }

    loadTracking()
    const interval = window.setInterval(loadTracking, 800)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [orderId])

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
    <section
      className={
        fillAvailableHeight
          ? '-mx-4 flex h-full min-h-0 flex-col overflow-hidden bg-background sm:-mx-6 lg:-mx-8'
          : 'flex h-96 min-h-0 flex-col overflow-hidden rounded-voro-xl border border-line bg-background sm:h-[26rem]'
      }
    >
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
        <div className="flex flex-wrap gap-2">
          {routeData.courier ? <button className="inline-flex w-fit items-center gap-2 rounded-voro-md border border-line px-2.5 py-1.5 text-xs font-bold text-action transition hover:bg-accent" onClick={() => setIsChatOpen(true)} type="button"><MessageCircle className="size-3.5" />Message courier</button> : null}
          {allowCancel ? <button className="inline-flex w-fit items-center gap-2 rounded-voro-md border border-destructive/30 px-2.5 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/10" onClick={onCancel} type="button">Cancel order</button> : null}
        </div>
      </div>

      <MapContainer center={courierPosition || endpoints[0]} className="min-h-0 flex-1 w-full" scrollWheelZoom={false} zoom={13}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {courierOnWay && routePoints.length > 1 ? <Polyline color="#ef5a35" pathOptions={{ opacity: 0.88, weight: 5 }} positions={routePoints} /> : null}
        <Marker icon={restaurantIcon} position={endpoints[0]}><Popup><strong>{routeData.restaurant.name}</strong><br />{t('map.restaurantPin')}</Popup></Marker>
        <Marker icon={deliveryIcon} position={endpoints[1]}><Popup><strong>{routeData.delivery.address || t('map.deliveryPin')}</strong><br />{t('map.deliveryPin')}</Popup></Marker>
        {courierPosition ? <AnimatedCourierMarker courierLabel={t('map.courierPin')} courierName={routeData.courier?.name || t('map.courier')} targetPosition={courierPosition} /> : null}
        <MapViewport points={mapPoints} />
      </MapContainer>
      {isChatOpen ? <OrderChatModal onClose={() => setIsChatOpen(false)} orderId={orderId} /> : null}
    </section>
  )
}
