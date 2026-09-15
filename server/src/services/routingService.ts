import { HttpError } from '../utils/httpError'

type OsrmRouteResponse = {
  code?: string
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: { coordinates?: Array<[number, number]> }
  }>
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

  // OSRM's duration is the only travel-time signal available here.  Applying
  // a fixed multiplier by hour made the ETA look more precise while often
  // doubling it.  Keep the provider estimate and communicate a modest range
  // instead; a traffic-aware provider can replace this calculation later.
  const etaMinutes = Math.max(1, Math.ceil((route.duration || 0) / 60))

  return {
    coordinates: path.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
    distanceMeters: Math.round(route.distance || 0),
    etaMinutes,
    etaRange: { min: etaMinutes, max: etaMinutes + 5 },
  }
}
