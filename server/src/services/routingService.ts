import { HttpError } from '../utils/httpError'
import { AStarRoutingError, findAStarDrivingRoute } from './aStarRouting'

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

  try {
    return await findAStarDrivingRoute(start, end)
  } catch (error) {
    if (error instanceof AStarRoutingError) throw new HttpError(error.status, error.message)
    throw new HttpError(502, 'Could not calculate the A* delivery route.')
  }
}
