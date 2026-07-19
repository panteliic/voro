import * as dispatchRepository from '../repositories/dispatchRepository'
import { pool } from '../database/pool'

const cellSize = 0.012
const retryDelayMs = 30_000
const workerPollIntervalMs = 1_500

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6_371_000
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function trafficFactor(hour: number) {
  if (hour >= 7 && hour <= 9) return 0.5
  if (hour >= 12 && hour <= 14) return 0.6
  if (hour >= 17 && hour <= 19) return 0.45
  if (hour >= 22 || hour <= 6) return 1
  return 0.75
}

function travelSpeedMetersPerSecond(vehicleType: string) {
  const vehicle = vehicleType.toLowerCase()

  if (vehicle.includes('bicycle')) return 4.2
  if (vehicle.includes('scooter')) return 7.5
  return 10
}

function cell(latitude: number, longitude: number) {
  return {
    latitude: Math.floor(latitude / cellSize),
    longitude: Math.floor(longitude / cellSize),
  }
}

function cellKey(latitude: number, longitude: number) {
  return `${latitude}:${longitude}`
}

function nearbyCandidates(
  order: dispatchRepository.DispatchOrder,
  couriers: dispatchRepository.DispatchCandidate[],
) {
  const buckets = new Map<string, dispatchRepository.DispatchCandidate[]>()

  for (const courier of couriers) {
    const courierCell = cell(courier.latitude, courier.longitude)
    const key = cellKey(courierCell.latitude, courierCell.longitude)
    buckets.set(key, [...(buckets.get(key) || []), courier])
  }

  const pickupCell = cell(order.restaurantLatitude, order.restaurantLongitude)

  for (let radius = 0; radius <= 5; radius += 1) {
    const candidates: dispatchRepository.DispatchCandidate[] = []

    for (let latitudeOffset = -radius; latitudeOffset <= radius; latitudeOffset += 1) {
      for (let longitudeOffset = -radius; longitudeOffset <= radius; longitudeOffset += 1) {
        if (Math.max(Math.abs(latitudeOffset), Math.abs(longitudeOffset)) !== radius) continue

        candidates.push(
          ...(buckets.get(
            cellKey(pickupCell.latitude + latitudeOffset, pickupCell.longitude + longitudeOffset),
          ) || []),
        )
      }
    }

    if (candidates.length > 0) {
      return candidates
    }
  }

  return couriers
}

function rankCandidate(order: dispatchRepository.DispatchOrder, courier: dispatchRepository.DispatchCandidate) {
  const distanceToRestaurant = haversineMeters(
    courier.latitude,
    courier.longitude,
    order.restaurantLatitude,
    order.restaurantLongitude,
  )
  const effectiveSpeed = travelSpeedMetersPerSecond(courier.vehicleType) * trafficFactor(new Date().getHours())
  const pickupEtaMinutes = Math.max(1, Math.ceil(distanceToRestaurant / effectiveSpeed / 60))

  return { courier, pickupEtaMinutes, distanceToRestaurant }
}

async function processDispatch(orderId: number) {
  try {
    const order = await dispatchRepository.getPreparingOrderForDispatch(orderId)

    if (!order) {
      await dispatchRepository.markDispatchFailed(orderId, 'Order no longer needs a courier assignment.')
      return
    }

    await dispatchRepository.markDispatchMatching(orderId)
    const couriers = await dispatchRepository.listAvailableOnlineCouriers()

    if (couriers.length === 0) {
      await dispatchRepository.markDispatchWaiting(
        orderId,
        'No online couriers are currently available.',
        retryDelayMs,
      )
      return
    }

    const bestMatch = nearbyCandidates(order, couriers)
      .map((courier) => rankCandidate(order, courier))
      .sort((first, second) => first.pickupEtaMinutes - second.pickupEtaMinutes || first.distanceToRestaurant - second.distanceToRestaurant)[0]

    const assignment = await dispatchRepository.assignCourierToOrder(order.id, bestMatch.courier.id)

    if (!assignment) {
      await dispatchRepository.markDispatchWaiting(
        orderId,
        'Candidate became unavailable before assignment.',
        2_000,
      )
      return
    }

    if (assignment.courierId) {
      await dispatchRepository.markDispatchAssigned(orderId, assignment.courierId)
      console.info(
        `Dispatch assigned order #${orderId} to courier #${assignment.courierId} (${bestMatch.pickupEtaMinutes} min pickup ETA).`,
      )
    } else {
      await dispatchRepository.markDispatchWaiting(
        orderId,
        'An existing delivery is still missing a courier.',
        2_000,
      )
    }
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
    .catch((error) => console.error(`Could not queue dispatch for order #${orderId}.`, error))
}

let isDispatchCycleRunning = false

export async function runDispatchCycle() {
  if (isDispatchCycleRunning) {
    return
  }

  isDispatchCycleRunning = true

  try {
    const orderIds = await dispatchRepository.listPendingDispatchOrderIds()

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
