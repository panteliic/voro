import * as driverRepository from '../repositories/driverRepository'
import { HttpError } from '../utils/httpError'

async function getOwnedDriver(userId: number) {
  const driver = await driverRepository.findDriverByUserId(userId)

  if (!driver) {
    throw new HttpError(404, 'Driver account is not linked to a courier profile.')
  }

  return driver
}

export async function getDashboard(userId: number) {
  const driver = await getOwnedDriver(userId)
  const deliveries = await driverRepository.listActiveDeliveries(driver.id)

  return { driver, deliveries }
}

export async function updatePresence(userId: number, payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Presence details are required.')
  }

  const { isOnline, latitude, longitude } = payload as Record<string, unknown>

  if (typeof isOnline !== 'boolean') {
    throw new HttpError(400, 'Online status must be true or false.')
  }

  const hasLatitude = latitude !== undefined && latitude !== null
  const hasLongitude = longitude !== undefined && longitude !== null

  if (hasLatitude !== hasLongitude) {
    throw new HttpError(400, 'Latitude and longitude must be sent together.')
  }

  const nextLatitude = hasLatitude ? Number(latitude) : null
  const nextLongitude = hasLongitude ? Number(longitude) : null

  if (
    (hasLatitude && !Number.isFinite(nextLatitude)) ||
    (hasLongitude && !Number.isFinite(nextLongitude)) ||
    (nextLatitude !== null && (nextLatitude < -90 || nextLatitude > 90)) ||
    (nextLongitude !== null && (nextLongitude < -180 || nextLongitude > 180))
  ) {
    throw new HttpError(400, 'Location coordinates are invalid.')
  }

  const driver = await driverRepository.updateDriverPresence(userId, {
    isOnline,
    latitude: nextLatitude,
    longitude: nextLongitude,
  })

  if (!driver) {
    throw new HttpError(404, 'Driver account is not linked to a courier profile.')
  }

  return { driver }
}
