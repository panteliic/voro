import * as driverRepository from '../repositories/driverRepository'
import * as redisService from './redisService'
import * as routingService from './routingService'
import type { DriverAnalytics, DriverAnalyticsDay, DriverAnalyticsPeriod } from '../types/driver'
import { HttpError } from '../utils/httpError'

type WorkSession = { started_at: Date; ended_at: Date | null; updated_at: Date }
type DeliveredTotal = { deliveredAt: Date; total: number }

async function getOwnedDriver(userId: number) {
  const driver = await driverRepository.findDriverByUserId(userId)

  if (!driver) {
    throw new HttpError(404, 'Driver account is not linked to a courier profile.')
  }

  return driver
}

function startOfDay(value = new Date()) {
  const day = new Date(value)
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(value: Date, amount: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

function dateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function workMinutesForPeriod(sessions: WorkSession[], from: Date, to: Date) {
  return Math.round(
    sessions.reduce((total, session) => {
      const start = Math.max(session.started_at.getTime(), from.getTime())
      const lastHeartbeat = new Date(session.updated_at).getTime() + 120_000
      const end = Math.min((session.ended_at?.getTime() || lastHeartbeat), to.getTime())
      return total + Math.max(0, end - start)
    }, 0) / 60_000,
  )
}

function deliveryPeriod(deliveries: DeliveredTotal[], sessions: WorkSession[], from: Date, to: Date): DriverAnalyticsPeriod {
  const completed = deliveries.filter(
    (delivery) => delivery.deliveredAt >= from && delivery.deliveredAt < to,
  )

  return {
    deliveries: completed.length,
    earnings: completed.reduce((total, delivery) => total + delivery.total, 0),
    workMinutes: workMinutesForPeriod(sessions, from, to),
  }
}

function buildAnalytics(deliveries: DeliveredTotal[], sessions: WorkSession[]): DriverAnalytics {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = addDays(todayStart, -((todayStart.getDay() + 6) % 7))
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
  const days: DriverAnalyticsDay[] = Array.from({ length: 7 }, (_, index) => {
    const from = addDays(todayStart, index - 6)
    const to = addDays(from, 1)
    return { date: dateKey(from), ...deliveryPeriod(deliveries, sessions, from, to) }
  })

  return {
    today: deliveryPeriod(deliveries, sessions, todayStart, now),
    week: deliveryPeriod(deliveries, sessions, weekStart, now),
    month: deliveryPeriod(deliveries, sessions, monthStart, now),
    days,
  }
}

export async function getDashboard(userId: number) {
  const driver = await getOwnedDriver(userId)
  const analyticsStart = addDays(startOfDay(), -31)
  const [deliveries, offers, history, sessions, deliveredTotals] = await Promise.all([
    driverRepository.listActiveDeliveries(driver.id),
    driverRepository.listPendingOffers(driver.id),
    driverRepository.listDriverHistory(driver.id),
    driverRepository.listRecentWorkSessions(driver.id, analyticsStart),
    driverRepository.listDeliveredTotals(driver.id, analyticsStart),
  ])

  return {
    driver,
    deliveries,
    activeDelivery: deliveries[0] || null,
    offers,
    history,
    analytics: buildAnalytics(deliveredTotals, sessions),
  }
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

  if (isOnline && (nextLatitude === null || nextLongitude === null)) {
    throw new HttpError(400, 'Current location is required before going online.')
  }

  const driver = await driverRepository.updateDriverPresence(userId, {
    isOnline,
    latitude: nextLatitude,
    longitude: nextLongitude,
  })

  if (!driver) {
    throw new HttpError(404, 'Driver account is not linked to a courier profile.')
  }

  if (nextLatitude !== null && nextLongitude !== null) {
    await driverRepository.recordActiveDeliveryLocation(driver.id, nextLatitude, nextLongitude)
  }

  await redisService.syncDriverPresence(driver)

  return { driver }
}

export async function acceptOffer(userId: number, offerId: number) {
  if (!Number.isInteger(offerId) || offerId <= 0) {
    throw new HttpError(400, 'Delivery offer was not found.')
  }

  const driver = await getOwnedDriver(userId)
  const deliveryId = await driverRepository.acceptDispatchOffer(driver.id, offerId)

  if (!deliveryId) {
    throw new HttpError(409, 'This delivery has already been accepted or is no longer available.')
  }

  const [delivery, updatedDriver] = await Promise.all([
    driverRepository.getActiveDelivery(driver.id, deliveryId),
    getOwnedDriver(userId),
  ])
  await redisService.syncDriverPresence(updatedDriver)

  return { delivery }
}

export async function declineOffer(userId: number, offerId: number) {
  if (!Number.isInteger(offerId) || offerId <= 0) {
    throw new HttpError(400, 'Delivery offer was not found.')
  }

  const driver = await getOwnedDriver(userId)
  const declined = await driverRepository.declineDispatchOffer(driver.id, offerId)

  if (!declined) {
    throw new HttpError(409, 'This delivery offer is no longer available.')
  }

  return { declined: true }
}

export async function updateDeliveryStatus(userId: number, deliveryId: number, status: unknown) {
  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    throw new HttpError(400, 'Delivery was not found.')
  }

  if (status !== 'picked_up' && status !== 'on_the_way' && status !== 'delivered') {
    throw new HttpError(400, 'Delivery status is invalid.')
  }

  const driver = await getOwnedDriver(userId)
  const updated = await driverRepository.setDeliveryStatus(driver.id, deliveryId, status)

  if (!updated) {
    throw new HttpError(400, 'This delivery cannot move to that status.')
  }

  await redisService.syncDriverPresence(await getOwnedDriver(userId))

  return { delivery: updated }
}

export async function getDeliveryRoute(userId: number, deliveryId: number) {
  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    throw new HttpError(400, 'Delivery was not found.')
  }

  const driver = await getOwnedDriver(userId)
  const delivery = await driverRepository.getActiveDelivery(driver.id, deliveryId)

  if (!delivery) {
    throw new HttpError(404, 'Active delivery was not found.')
  }

  if (driver.currentLatitude === null || driver.currentLongitude === null) {
    throw new HttpError(400, 'Share the current location to calculate the route.')
  }

  const toRestaurant = delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant'
  const destination = toRestaurant
    ? {
        type: 'restaurant' as const,
        name: delivery.restaurantName,
        address: delivery.restaurantAddress,
        latitude: delivery.restaurantLatitude,
        longitude: delivery.restaurantLongitude,
      }
    : {
        type: 'customer' as const,
        name: delivery.customerName,
        address: delivery.customerAddress,
        latitude: delivery.customerLatitude,
        longitude: delivery.customerLongitude,
      }

  const route = await routingService.findDrivingRoute(
    { latitude: driver.currentLatitude, longitude: driver.currentLongitude },
    { latitude: destination.latitude, longitude: destination.longitude },
  )

  return {
    deliveryId: delivery.id,
    currentLocation: { latitude: driver.currentLatitude, longitude: driver.currentLongitude },
    destination,
    route,
  }
}
