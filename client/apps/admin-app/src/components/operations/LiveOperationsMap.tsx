import { useEffect } from 'react'
import * as L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { OperationsOrder } from '../../types/operations'

const restaurantIcon = L.divIcon({
  className: 'voro-operations-pin',
  html: '<span style="display:grid;height:32px;width:32px;place-items:center;border:2px solid white;border-radius:50%;background:#ef5a35;box-shadow:0 3px 10px rgba(0,0,0,.3);font-size:15px">🍽️</span>',
  iconAnchor: [16, 16],
  iconSize: [32, 32],
})
const customerIcon = L.divIcon({
  className: 'voro-operations-pin',
  html: '<span style="display:grid;height:32px;width:32px;place-items:center;border:2px solid white;border-radius:50%;background:#1f9d73;box-shadow:0 3px 10px rgba(0,0,0,.3);font-size:15px">🏠</span>',
  iconAnchor: [16, 16],
  iconSize: [32, 32],
})
const courierIcon = L.divIcon({
  className: 'voro-operations-pin',
  html: '<span style="display:grid;height:32px;width:32px;place-items:center;border:2px solid white;border-radius:50%;background:#2c6bed;box-shadow:0 3px 10px rgba(0,0,0,.3);font-size:15px">🛵</span>',
  iconAnchor: [16, 16],
  iconSize: [32, 32],
})

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
      if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 14 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, points])
  return null
}

export function LiveOperationsMap({ orders }: { orders: OperationsOrder[] }) {
  const points = orders.flatMap((order) => [
    order.restaurantLatitude !== null && order.restaurantLongitude !== null ? [[order.restaurantLatitude, order.restaurantLongitude] as [number, number]] : [],
    order.customerLatitude !== null && order.customerLongitude !== null ? [[order.customerLatitude, order.customerLongitude] as [number, number]] : [],
    order.courierLatitude !== null && order.courierLongitude !== null ? [[order.courierLatitude, order.courierLongitude] as [number, number]] : [],
  ].flat())

  return <div className="h-[22rem] overflow-hidden border-b border-line sm:h-[28rem]"><MapContainer center={points[0] || [44.816, 20.46]} className="size-full" scrollWheelZoom zoom={12}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{orders.map((order) => <div key={order.id}>{order.restaurantLatitude !== null && order.restaurantLongitude !== null ? <Marker icon={restaurantIcon} position={[order.restaurantLatitude, order.restaurantLongitude]}><Popup><strong>{order.restaurantName}</strong><br />Order #{order.id} pickup</Popup></Marker> : null}{order.customerLatitude !== null && order.customerLongitude !== null ? <Marker icon={customerIcon} position={[order.customerLatitude, order.customerLongitude]}><Popup><strong>{order.customerName}</strong><br />Order #{order.id} delivery</Popup></Marker> : null}{order.courierLatitude !== null && order.courierLongitude !== null ? <Marker icon={courierIcon} position={[order.courierLatitude, order.courierLongitude]}><Popup><strong>{order.courierName || 'Courier'}</strong><br />Order #{order.id} · {order.deliveryStatus || 'assigned'}</Popup></Marker> : null}</div>)}<FitBounds points={points} /></MapContainer></div>
}
