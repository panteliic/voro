import { HttpError } from '../utils/httpError'

type OsrmRouteResponse = {
  code?: string
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: { coordinates?: Array<[number, number]> }
  }>
}

function trafficFactor(hour: number) {
  if (hour >= 7 && hour <= 9) return 0.5
  if (hour >= 12 && hour <= 14) return 0.6
  if (hour >= 17 && hour <= 19) return 0.45
  if (hour >= 22 || hour <= 6) return 1
  return 0.75
}

function validCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

export async function findDrivingRoute(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) {
  if (!validCoordinate(start.latitude, start.longitude) || !validCoordinate(end.latitude, end.longitude)) {
    throw new HttpError(400, 'Both delivery locations need valid coordinates.')
  }

  const coordinates = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinates}`)
  url.searchParams.set('overview', 'full')
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('alternatives', 'false')

  let response: Response

  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  } catch {
    throw new HttpError(502, 'Could not reach the routing service.')
  }

  if (!response.ok) {
    throw new HttpError(502, 'Could not calculate the delivery route.')
  }

  const data = (await response.json()) as OsrmRouteResponse
  const route = data.routes?.[0]
  const path = route?.geometry?.coordinates

  if (data.code !== 'Ok' || !route || !path || path.length < 2) {
    throw new HttpError(404, 'No driving route was found for these locations.')
  }

  const baseMinutes = Math.max(1, Math.ceil((route.duration || 0) / 60))
  const etaMinutes = Math.max(1, Math.ceil(baseMinutes / trafficFactor(new Date().getHours())))

  return {
    coordinates: path.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
    distanceMeters: Math.round(route.distance || 0),
    etaMinutes,
    etaRange: { min: etaMinutes, max: etaMinutes + 5 },
  }
}
