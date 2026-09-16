import { useEffect } from 'react'
import * as L from 'leaflet'
import { MapPin } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../../i18n/i18n'
import type { Driver } from '../../types/driver'

const cartoBasemapKey = import.meta.env.VITE_CARTO_BASEMAP_KEY?.trim()
const cartoTileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoBasemapKey ? `?key=${encodeURIComponent(cartoBasemapKey)}` : ''}`

const driverPin = L.divIcon({
  className: 'voro-driver-location-pin',
  html: '<span style="display:grid;height:38px;width:38px;place-items:center;border:3px solid white;border-radius:50%;background:#2c6bed;box-shadow:0 4px 12px rgba(0,0,0,.28);font-size:18px">🛵</span>',
  iconAnchor: [19, 19],
  iconSize: [38, 38],
})

function FollowDriver({ point }: { point: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
      map.setView(point, 16, { animate: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, point])

  return null
}

export function DriverLocationMap({ driver }: { driver: Driver }) {
  const { t } = useI18n()
  const hasLocation = driver.currentLatitude !== null && driver.currentLongitude !== null
  const point: [number, number] = hasLocation
    ? [driver.currentLatitude as number, driver.currentLongitude as number]
    : [44.816, 20.46]
  const locationState = driver.isLocationLive ? t('drivers.liveLocation') : t('drivers.lastKnownLocation')

  return (
    <article className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-action" />
          <div className="min-w-0">
            <h2 className="font-bold">{t('drivers.locationMap')}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{hasLocation ? (driver.locationAddress || t('drivers.locationPending')) : t('drivers.noLocation')}</p>
          </div>
        </div>
        <span className={`rounded-voro-md px-2.5 py-1 text-xs font-bold ${driver.isLocationLive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
          {locationState}
        </span>
      </div>
      {hasLocation ? (
        <div className="h-72 sm:h-80">
          <MapContainer center={point} className="size-full" scrollWheelZoom zoom={16}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' url={cartoTileUrl} />
            <Marker icon={driverPin} position={point}>
              <Popup>
                <strong>{driver.name}</strong><br />
                {driver.locationAddress || t('drivers.locationPending')}<br />
                {locationState}
              </Popup>
            </Marker>
            <FollowDriver point={point} />
          </MapContainer>
        </div>
      ) : (
        <div className="grid h-48 place-items-center px-5 text-center text-sm text-muted-foreground">{t('drivers.noLocation')}</div>
      )}
    </article>
  )
}
