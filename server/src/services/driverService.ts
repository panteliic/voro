import * as driverRepository from '../repositories/driverRepository'
import * as redisService from './redisService'
import * as routingService from './routingService'
import * as dispatchService from './dispatchService'
import * as geocodingService from './geocodingService'
import * as operationsRepository from '../repositories/operationsRepository'
import { publishDriverLocation, publishOrderMessage, publishOrderTracking } from './realtimeService'
import { notifyUser, notifyUserOnceCourierIsNearby } from './notificationService'
import type { DriverAnalytics, DriverAnalyticsDay, DriverAnalyticsPeriod, DriverProfile } from '../types/driver'
import { HttpError } from '../utils/httpError'
import { sanitizePlainText } from '../utils/securityInput'
import { logEvent } from './observability'

type WorkSession = { started_at: Date; ended_at: Date | null; updated_at: Date }
type DeliveredTotal = { deliveredAt: Date; total: number }
const customerNearbyDistanceMeters = 250
const pickupConfirmationDistanceMeters = 200
const deliveryConfirmationDistanceMeters = 200
const statusLocationMaxAgeMs = 45_000
const locationAddressRefreshDistanceMeters = 250
const locationAddressRefreshIntervalMs = 15 * 60 * 1000
const locationAddressRequestDelayMs = 1_100
const queuedDriverAddressIds = new Set<number>()
const pendingDriverAddressRefreshes: DriverProfile[] = []
let isProcessingDriverAddressRefreshes = false

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6_371_000
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function hasFreshDriverLocation(driver: DriverProfile) {
  return Boolean(
    driver.isOnline &&
    driver.currentLatitude !== null &&
    driver.currentLongitude !== null &&
    driver.lastLocationAt !== null &&
    Date.now() - driver.lastLocationAt.getTime() <= statusLocationMaxAgeMs,
  )
}

function requireNearbyDeliveryStop(
  driver: DriverProfile,
  target: { latitude: number; longitude: number; label: string },
  maximumDistanceMeters: number,
) {
  if (!hasFreshDriverLocation(driver)) {
    throw new HttpError(409, 'A fresh GPS location is required before updating this delivery.')
  }

  const distanceMeters = Math.round(haversineMeters(
    driver.currentLatitude as number,
    driver.currentLongitude as number,
    target.latitude,
    target.longitude,
  ))
  if (distanceMeters > maximumDistanceMeters) {
    throw new HttpError(
      409,
      `You must be within ${maximumDistanceMeters} m of ${target.label} before updating this delivery. You are ${distanceMeters} m away.`,
    )
  }
}

function straightLineRouteEstimate(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) {
  // A resilient fallback when the public routing provider is unavailable.
  // Urban motorcycle/car travel is deliberately estimated conservatively.
  const directDistanceMeters = Math.round(haversineMeters(
    start.latitude,
    start.longitude,
    end.latitude,
    end.longitude,
  ))
  const distanceMeters = Math.max(100, Math.round(directDistanceMeters * 1.28))
  const etaMinutes = Math.max(1, Math.ceil((distanceMeters / 1000 / 18) * 60 + 1))

  return {
    distanceMeters,
    etaMinutes,
    etaRange: { min: etaMinutes, max: etaMinutes + 5 },
  }
}

async function routeEstimate(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) {
  try {
    return await routingService.findDrivingRoute(start, end)
  } catch {
    return straightLineRouteEstimate(start, end)
  }
}

function scheduleDriverLocationAddressRefresh(driver: DriverProfile) {
  if (
    driver.currentLatitude === null ||
    driver.currentLongitude === null ||
    queuedDriverAddressIds.has(driver.id)
  ) {
    return
  }

  const hasRecentNearbyAddress =
    Boolean(driver.lastLocationAddress) &&
    driver.lastLocationAddressLatitude !== null &&
    driver.lastLocationAddressLongitude !== null &&
    driver.lastLocationAddressAt !== null &&
    Date.now() - driver.lastLocationAddressAt.getTime() < locationAddressRefreshIntervalMs &&
    haversineMeters(
      driver.currentLatitude,
      driver.currentLongitude,
      driver.lastLocationAddressLatitude,
      driver.lastLocationAddressLongitude,
    ) < locationAddressRefreshDistanceMeters

  if (hasRecentNearbyAddress) return

  queuedDriverAddressIds.add(driver.id)
  pendingDriverAddressRefreshes.push(driver)
  if (!isProcessingDriverAddressRefreshes) void processDriverLocationAddressRefreshes()
}

async function processDriverLocationAddressRefreshes() {
  isProcessingDriverAddressRefreshes = true

  try {
    while (pendingDriverAddressRefreshes.length > 0) {
      const driver = pendingDriverAddressRefreshes.shift()!
      try {
        const location = await geocodingService.reverseGeocodeAddress(
          driver.currentLatitude as number,
          driver.currentLongitude as number,
        )
        await driverRepository.updateDriverLocationAddress(driver.id, {
          latitude: driver.currentLatitude as number,
          longitude: driver.currentLongitude as number,
          address: location.displayName,
        })
      } catch (error) {
        logEvent('warn', 'driver_location_address_refresh_failed', {
          driverId: driver.id,
          message: error instanceof Error ? error.message : String(error),
        })
      } finally {
        queuedDriverAddressIds.delete(driver.id)
      }

      if (pendingDriverAddressRefreshes.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, locationAddressRequestDelayMs))
      }
    }
  } finally {
    isProcessingDriverAddressRefreshes = false
  }
}

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

  const existingDriver = await getOwnedDriver(userId)
  if (await redisService.isDriverSimulatorActive(existingDriver.id)) {
    // The local simulator owns this courier's coordinates while its short
    // Redis lease is renewed. This prevents an open driver tab from replacing
    // the simulated location with its demo/GPS heartbeat.
    return { driver: existingDriver }
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
    publishDriverLocation(userId, { latitude: nextLatitude, longitude: nextLongitude })
    const activeDelivery = await driverRepository.recordActiveDeliveryLocation(driver.id, nextLatitude, nextLongitude)
    if (activeDelivery) {
      publishOrderTracking({
        orderId: activeDelivery.orderId,
        courier: { name: driver.name, latitude: nextLatitude, longitude: nextLongitude },
        deliveryStatus: activeDelivery.deliveryStatus,
      })

      if (
        activeDelivery.deliveryStatus === 'on_the_way' &&
        activeDelivery.customerLatitude !== null &&
        activeDelivery.customerLongitude !== null
      ) {
        const distanceMeters = Math.round(haversineMeters(
          nextLatitude,
          nextLongitude,
          activeDelivery.customerLatitude,
          activeDelivery.customerLongitude,
        ))
        if (distanceMeters <= customerNearbyDistanceMeters) {
          await notifyUserOnceCourierIsNearby(activeDelivery.customerUserId, activeDelivery.orderId, distanceMeters)
        }
      }
    }
  }

  await redisService.syncDriverPresence(driver)
  scheduleDriverLocationAddressRefresh(driver)

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

  if (delivery) {
    publishOrderTracking({
      orderId: delivery.orderId,
      courier: {
        name: updatedDriver.name,
        latitude: updatedDriver.currentLatitude,
        longitude: updatedDriver.currentLongitude,
      },
      deliveryStatus: delivery.status,
    })
  }

  const owner = await operationsRepository.getOrderOwner(delivery?.orderId || 0)
  if (owner) {
    await Promise.all([
      notifyUser(Number(owner.user_id), {
        type: 'courier_assigned',
        title: `Courier assigned to order #${delivery?.orderId}`,
        body: `${updatedDriver.name} is heading to the restaurant.`,
        data: { orderId: delivery?.orderId },
      }),
      operationsRepository.createRestaurantNotification(Number(owner.restaurant_id), {
        type: 'courier_assigned',
        title: `Courier assigned to order #${delivery?.orderId}`,
        body: `${updatedDriver.name} has accepted the delivery.`,
        data: { orderId: delivery?.orderId },
      }),
    ])
  }

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

export async function updateDeliveryStatus(
  userId: number,
  deliveryId: number,
  status: unknown,
  proofPayload: Record<string, unknown> = {},
) {
  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    throw new HttpError(400, 'Delivery was not found.')
  }

  if (status !== 'picked_up' && status !== 'on_the_way' && status !== 'delivered') {
    throw new HttpError(400, 'Delivery status is invalid.')
  }

  const driver = await getOwnedDriver(userId)
  const activeDelivery = await driverRepository.getActiveDelivery(driver.id, deliveryId)
  if (!activeDelivery) {
    throw new HttpError(404, 'Active delivery was not found.')
  }

  if (status === 'picked_up') {
    if (activeDelivery.orderStatus !== 'ready') {
      throw new HttpError(409, 'The restaurant has not marked this order as ready yet.')
    }
    requireNearbyDeliveryStop(
      driver,
      {
        latitude: activeDelivery.restaurantLatitude,
        longitude: activeDelivery.restaurantLongitude,
        label: 'the restaurant',
      },
      pickupConfirmationDistanceMeters,
    )
  }

  if (status === 'delivered') {
    requireNearbyDeliveryStop(
      driver,
      {
        latitude: activeDelivery.customerLatitude,
        longitude: activeDelivery.customerLongitude,
        label: 'the customer address',
      },
      deliveryConfirmationDistanceMeters,
    )
  }

  const note = sanitizePlainText(proofPayload.proofNote, 500)
  const updated = await driverRepository.setDeliveryStatus(driver.id, deliveryId, status, { note })

  if (!updated) {
    throw new HttpError(
      400,
      'This delivery cannot move to that status.',
    )
  }

  await redisService.syncDriverPresence(await getOwnedDriver(userId))

  publishOrderTracking({
    orderId: activeDelivery.orderId,
    courier: {
      name: driver.name,
      latitude: driver.currentLatitude,
      longitude: driver.currentLongitude,
    },
    deliveryStatus: updated.status,
  })

  const owner = await operationsRepository.getOrderOwner(activeDelivery.orderId)
  if (owner) {
    const message = status === 'picked_up'
      ? 'Your order was picked up and will leave the restaurant shortly.'
      : status === 'on_the_way'
        ? 'Your courier is on the way. You can follow the route live.'
        : 'Your delivery has been completed. Enjoy your meal!'
    await notifyUser(Number(owner.user_id), {
      type: 'delivery_status',
      title: `Order #${activeDelivery.orderId}: ${status.replace(/_/g, ' ')}`,
      body: message,
      data: { orderId: activeDelivery.orderId, status },
    })
  }

  return { delivery: updated }
}

export async function withdrawFromDelivery(userId: number, deliveryId: number, reasonValue: unknown) {
  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    throw new HttpError(400, 'Delivery was not found.')
  }

  const driver = await getOwnedDriver(userId)
  const reason = sanitizePlainText(reasonValue, 500)
  const withdrawn = await driverRepository.withdrawFromDelivery(driver.id, userId, deliveryId, reason)
  if (!withdrawn) {
    throw new HttpError(409, 'Only a delivery that has not been picked up can be reassigned.')
  }

  const owner = await operationsRepository.getOrderOwner(withdrawn.orderId)
  await redisService.syncDriverPresence(await getOwnedDriver(userId))
  if (owner) {
    await notifyUser(Number(owner.user_id), {
      type: 'courier_reassignment',
      title: `Order #${withdrawn.orderId}: finding a new courier`,
      body: 'Your courier could not complete pickup. We are finding another available courier now.',
      data: { orderId: withdrawn.orderId },
    })
  }
  dispatchService.enqueueDispatch(withdrawn.orderId)
  return { withdrawn: true, orderId: withdrawn.orderId }
}

export async function getOrderMessages(userId: number, orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const messages = await operationsRepository.listOrderMessages(orderId, userId, 'courier')
  if (!messages) throw new HttpError(404, 'Order conversation not found.')
  return { messages }
}

export async function sendOrderMessage(userId: number, orderId: number, bodyValue: unknown) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const body = sanitizePlainText(bodyValue, 1_000)
  if (!body) throw new HttpError(400, 'Message cannot be empty.')
  const message = await operationsRepository.createOrderMessage(orderId, userId, 'courier', body)
  if (!message) throw new HttpError(409, 'Order conversation not found.')
  publishOrderMessage(message)
  const owner = await operationsRepository.getOrderOwner(orderId)
  if (owner) {
    const customerUserId = Number(owner.user_id)
    await notifyUser(customerUserId, {
      type: 'new_message',
      title: `New message for order #${orderId}`,
      body,
      data: { orderId },
    })
  }
  return { message }
}

export async function getNotifications(userId: number) {
  const notifications = await operationsRepository.listUserNotifications(userId)
  return { notifications, unreadCount: notifications.filter((notification) => !notification.readAt).length }
}

export async function readNotification(userId: number, notificationId: number) {
  if (!Number.isInteger(notificationId) || notificationId <= 0) throw new HttpError(400, 'Notification not found.')
  if (!(await operationsRepository.markUserNotificationRead(userId, notificationId))) {
    throw new HttpError(404, 'Notification not found.')
  }
  return { read: true }
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

export async function getOfferRouteEstimate(userId: number, offerId: number) {
  if (!Number.isInteger(offerId) || offerId <= 0) {
    throw new HttpError(400, 'Delivery offer was not found.')
  }

  const driver = await getOwnedDriver(userId)
  if (!hasFreshDriverLocation(driver)) {
    throw new HttpError(409, 'Share a fresh current location to calculate the offer time.')
  }

  const offer = (await driverRepository.listPendingOffers(driver.id))
    .find((candidate) => candidate.id === offerId)
  if (!offer) {
    throw new HttpError(404, 'This delivery offer is no longer available.')
  }

  const currentLocation = {
    latitude: driver.currentLatitude as number,
    longitude: driver.currentLongitude as number,
  }
  const restaurantLocation = {
    latitude: offer.restaurantLatitude,
    longitude: offer.restaurantLongitude,
  }
  const customerLocation = {
    latitude: offer.customerLatitude,
    longitude: offer.customerLongitude,
  }
  const [toRestaurant, toCustomer] = await Promise.all([
    routeEstimate(currentLocation, restaurantLocation),
    routeEstimate(restaurantLocation, customerLocation),
  ])

  return {
    offerId: offer.id,
    currentLocation,
    toRestaurant,
    toCustomer,
    total: {
      distanceMeters: toRestaurant.distanceMeters + toCustomer.distanceMeters,
      etaMinutes: toRestaurant.etaMinutes + toCustomer.etaMinutes,
      etaRange: {
        min: toRestaurant.etaRange.min + toCustomer.etaRange.min,
        max: toRestaurant.etaRange.max + toCustomer.etaRange.max,
      },
    },
  }
}
