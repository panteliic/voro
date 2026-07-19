import * as dispatchRepository from '../repositories/dispatchRepository'
import * as driverRepository from '../repositories/driverRepository'
import * as redisService from './redisService'
import { pool } from '../database/pool'

const offerWindowMs = 25_000
const retryDelayMs = 30_000
const workerPollIntervalMs = 1_500
const matchingRadiusMeters = 7_500
const databaseSweepIntervalMs = 20_000

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6_371_000
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearbyCandidates(
  order: dispatchRepository.DispatchOrder,
  couriers: dispatchRepository.DispatchCandidate[],
) {
  return couriers
    .map((courier) => ({
      courier,
      distanceMeters: haversineMeters(
        courier.latitude,
        courier.longitude,
        order.restaurantLatitude,
        order.restaurantLongitude,
      ),
    }))
    .filter(({ distanceMeters }) => distanceMeters <= matchingRadiusMeters)
    .sort((first, second) => first.distanceMeters - second.distanceMeters)
}

async function processDispatch(orderId: number) {
  try {
    const order = await dispatchRepository.getPreparingOrderForDispatch(orderId)

    if (!order) {
      await dispatchRepository.markDispatchFailed(orderId, 'Order no longer needs a courier assignment.')
      return
    }

    await dispatchRepository.markDispatchMatching(orderId)
    const liveCouriers = await redisService.listNearbyLiveDrivers(
      order.restaurantLatitude,
      order.restaurantLongitude,
      matchingRadiusMeters,
    )
    const couriers = liveCouriers.length > 0
      ? liveCouriers.map((courier) => ({
          id: courier.id,
          name: courier.name,
          vehicleType: courier.vehicleType,
          latitude: courier.currentLatitude,
          longitude: courier.currentLongitude,
        }))
      : await dispatchRepository.listAvailableOnlineCouriers()
    const nearby = nearbyCandidates(order, couriers)

    if (nearby.length === 0) {
      await dispatchRepository.markDispatchWaiting(
        orderId,
        'No available courier is currently within the delivery radius.',
        retryDelayMs,
      )
      return
    }

    const offerCount = await dispatchRepository.createDispatchOffers(
      orderId,
      nearby.map(({ courier }) => courier.id),
      offerWindowMs,
    )
    await dispatchRepository.markDispatchWaiting(
      orderId,
      `Offer sent to ${offerCount} nearby courier${offerCount === 1 ? '' : 's'}.`,
      offerWindowMs,
    )
    console.info(`Dispatch offered order #${orderId} to ${offerCount} nearby couriers.`)
  } catch (error) {
    console.error(`Dispatch failed for order #${orderId}.`, error)
    await dispatchRepository
      .markDispatchWaiting(orderId, 'Temporary dispatch error.', retryDelayMs)
      .catch(() => undefined)
  }
}

export function enqueueDispatch(orderId: number) {
  void dispatchRepository
    .queueDispatch(orderId)
    .then(() => redisService.enqueueDispatch(orderId))
    .catch((error) => console.error(`Could not queue dispatch for order #${orderId}.`, error))
}

let isDispatchCycleRunning = false
let lastDatabaseSweepAt = 0

export async function runDispatchCycle() {
  if (isDispatchCycleRunning) {
    return
  }

  isDispatchCycleRunning = true

  try {
    const expiredDriverIds = await driverRepository.expireStaleDriverPresence()
    await Promise.all(expiredDriverIds.map((driverId) => redisService.removeDriverPresence(driverId)))

    const queuedOrderIds = await redisService.dequeueDispatchBatch()
    const now = Date.now()
    const pendingOrderIds = now - lastDatabaseSweepAt >= databaseSweepIntervalMs
      ? await dispatchRepository.listPendingDispatchOrderIds()
      : []
    if (pendingOrderIds.length > 0 || now - lastDatabaseSweepAt >= databaseSweepIntervalMs) {
      lastDatabaseSweepAt = now
    }
    const orderIds = [...new Set([...queuedOrderIds, ...pendingOrderIds])]

    for (const orderId of orderIds) {
      await processDispatch(orderId)
    }
  } finally {
    isDispatchCycleRunning = false
  }
}

export function startDispatchWorker() {
  console.info('Dispatch worker started.')
  void runDispatchCycle()

  const interval = setInterval(() => {
    void runDispatchCycle()
  }, workerPollIntervalMs)

  const shutdown = () => {
    clearInterval(interval)
    void pool.end().finally(() => process.exit(0))
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}
