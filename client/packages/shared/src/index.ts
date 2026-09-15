export type AppRole = 'customer' | 'restaurant' | 'driver'

export type HealthState = 'online' | 'syncing' | 'attention'

export type RoutePoint = [latitude: number, longitude: number]

export type RouteMatch = {
  position: RoutePoint
  distanceMeters: number
  distanceAlongMeters: number
  totalDistanceMeters: number
  segmentIndex: number
}

const earthRadiusMeters = 6_371_000

function segmentDistanceMeters(first: RoutePoint, second: RoutePoint) {
  const latitudeDelta = ((second[0] - first[0]) * Math.PI) / 180
  const longitudeDelta = ((second[1] - first[1]) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((first[0] * Math.PI) / 180) *
      Math.cos((second[0] * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Projects a GPS point onto the closest segment of an already calculated road
 * route.  Using a small local projection is accurate at city-delivery scale
 * and avoids a map-matching network request for every GPS observation.
 */
export function matchPointToRoute(point: RoutePoint, route: RoutePoint[]): RouteMatch | null {
  if (route.length < 2) return null

  const latitudeScale = (Math.PI / 180) * earthRadiusMeters
  const longitudeScale = latitudeScale * Math.cos((point[0] * Math.PI) / 180)
  let distanceAlongMeters = 0
  let best: RouteMatch | null = null
  let totalDistanceMeters = 0

  for (let index = 0; index < route.length - 1; index += 1) {
    const start = route[index]
    const end = route[index + 1]
    const x = (end[1] - start[1]) * longitudeScale
    const y = (end[0] - start[0]) * latitudeScale
    const lengthSquared = x * x + y * y
    const pointX = (point[1] - start[1]) * longitudeScale
    const pointY = (point[0] - start[0]) * latitudeScale
    const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (pointX * x + pointY * y) / lengthSquared))
    const position: RoutePoint = [
      start[0] + (end[0] - start[0]) * fraction,
      start[1] + (end[1] - start[1]) * fraction,
    ]
    const distanceMeters = segmentDistanceMeters(point, position)
    const segmentMeters = segmentDistanceMeters(start, end)
    const candidate: RouteMatch = {
      position,
      distanceMeters,
      distanceAlongMeters: distanceAlongMeters + segmentMeters * fraction,
      totalDistanceMeters: 0,
      segmentIndex: index,
    }

    if (!best || candidate.distanceMeters < best.distanceMeters) best = candidate
    distanceAlongMeters += segmentMeters
    totalDistanceMeters += segmentMeters
  }

  return best ? { ...best, totalDistanceMeters } : null
}

export function remainingRouteFromMatch(route: RoutePoint[], match: RouteMatch) {
  const remaining = [match.position, ...route.slice(match.segmentIndex + 1)]
  return remaining.filter((point, index) => index === 0 || point[0] !== remaining[index - 1][0] || point[1] !== remaining[index - 1][1])
}

export function routeDistanceMeters(route: RoutePoint[]) {
  return route.slice(1).reduce((total, point, index) => total + segmentDistanceMeters(route[index], point), 0)
}
