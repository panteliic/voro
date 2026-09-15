import { env } from '../config/env'
import type { LocalDemoDelivery } from '../repositories/driverRepository'
import * as driverRepository from '../repositories/driverRepository'
import * as driverService from '../services/driverService'
import { logEvent, trackError } from '../services/observability'
import * as redisService from '../services/redisService'
import * as routingService from '../services/routingService'

type Position = { latitude: number; longitude: number }

type SimulationState = {
  courierId: number
  position: Position
  route: Position[] | null
  destinationKey: string
  nextRoutePointIndex: number
  status: LocalDemoDelivery['status']
}

let timer: NodeJS.Timeout | null = null
let isTickRunning = false
let isStopping = false
const states = new Map<number, SimulationState>()
const earthRadiusMeters = 6_371_000

function distanceMeters(first: Position, second: Position) {
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((first.latitude * Math.PI) / 180) *
      Math.cos((second.latitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function initialPosition(delivery: LocalDemoDelivery): Position {
  if (delivery.courierLatitude !== null && delivery.courierLongitude !== null) {
    return { latitude: delivery.courierLatitude, longitude: delivery.courierLongitude }
  }

  // A nearby starting point gives a newly assigned local demo courier a
  // visible approach route without requiring a previously opened driver app.
  return {
    latitude: delivery.restaurantLatitude - 0.003,
    longitude: delivery.restaurantLongitude - 0.002,
  }
}

function stateFor(delivery: LocalDemoDelivery) {
  const existing = states.get(delivery.id)
  if (existing) {
    if (existing.status !== delivery.status) {
      existing.status = delivery.status
      existing.route = null
      existing.destinationKey = ''
      existing.nextRoutePointIndex = 1
    }
    return existing
  }

  const state: SimulationState = {
    courierId: delivery.courierId,
    position: initialPosition(delivery),
    route: null,
    destinationKey: '',
    nextRoutePointIndex: 1,
    status: delivery.status,
  }
  states.set(delivery.id, state)
  logEvent('info', 'local_delivery_demo_started', {
    deliveryId: delivery.id,
    orderId: delivery.orderId,
    courierId: delivery.courierId,
  })
  return state
}

function moveAlongRoute(
  current: Position,
  routePoints: Position[],
  nextPointIndex: number,
  maxStepMeters: number,
) {
  let point = current
  let remainingStepMeters = maxStepMeters
  let index = nextPointIndex

  while (index < routePoints.length) {
    const nextPoint = routePoints[index]
    const segmentMeters = distanceMeters(point, nextPoint)

    if (segmentMeters < 0.25) {
      point = nextPoint
      index += 1
      continue
    }

    if (remainingStepMeters < segmentMeters) {
      const fraction = remainingStepMeters / segmentMeters
      return {
        point: {
          latitude: point.latitude + (nextPoint.latitude - point.latitude) * fraction,
          longitude: point.longitude + (nextPoint.longitude - point.longitude) * fraction,
        },
        nextPointIndex: index,
        arrived: false,
      }
    }

    point = nextPoint
    remainingStepMeters -= segmentMeters
    index += 1
  }

  return { point, nextPointIndex: index, arrived: true }
}

async function moveTowards(state: SimulationState, destination: Position) {
  const destinationKey = `${destination.latitude},${destination.longitude}`

  if (!state.route || state.destinationKey !== destinationKey) {
    try {
      const route = await routingService.findDrivingRoute(state.position, destination)
      state.route = [
        state.position,
        ...route.coordinates.slice(1).map(([latitude, longitude]) => ({ latitude, longitude })),
      ]
    } catch (error) {
      // A local demo should keep moving even if public OSRM is temporarily
      // unavailable. The customer map will request its own route again.
      trackError('local_delivery_demo_route_fallback', error)
      state.route = [state.position, destination]
    }
    state.destinationKey = destinationKey
    state.nextRoutePointIndex = 1
  }

  const next = moveAlongRoute(
    state.position,
    state.route,
    state.nextRoutePointIndex,
    env.localDeliveryDemo.stepMeters,
  )
  state.position = next.point
  state.nextRoutePointIndex = next.nextPointIndex
  return next.arrived
}

async function publishPosition(delivery: LocalDemoDelivery, position: Position): Promise<Position> {
  const leaseSeconds = Math.max(5, Math.ceil((env.localDeliveryDemo.intervalMs * 3) / 1_000))
  const speedMps = Math.min(
    55,
    env.localDeliveryDemo.stepMeters / Math.max(0.1, env.localDeliveryDemo.intervalMs / 1_000),
  )

  // updatePresence deliberately rejects browser GPS updates while this lease
  // is held. Release it only for the worker's trusted server-side sample.
  await redisService.clearDriverSimulatorLease(delivery.courierId)
  try {
    const { driver } = await driverService.updatePresence(delivery.courierUserId, {
      isOnline: true,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: 8,
      speedMps,
      capturedAt: new Date().toISOString(),
    })
    if (driver.currentLatitude === null || driver.currentLongitude === null) {
      throw new Error('The local delivery demo worker could not confirm the courier location.')
    }
    return { latitude: driver.currentLatitude, longitude: driver.currentLongitude }
  } finally {
    await redisService.refreshDriverSimulatorLease(delivery.courierId, leaseSeconds).catch(() => undefined)
  }
}

function reconcileConfirmedPosition(state: SimulationState, confirmedPosition: Position) {
  if (distanceMeters(state.position, confirmedPosition) < 1) return

  // The server can reject an implausibly large GPS jump. Continue from the
  // last accepted coordinate instead of allowing the local route state to get
  // ahead of the authoritative courier position.
  state.position = confirmedPosition
  state.route = null
  state.destinationKey = ''
  state.nextRoutePointIndex = 1
}

async function advanceDelivery(delivery: LocalDemoDelivery) {
  const state = stateFor(delivery)

  if (delivery.status === 'assigned' || delivery.status === 'arriving_to_restaurant') {
    await moveTowards(state, {
      latitude: delivery.restaurantLatitude,
      longitude: delivery.restaurantLongitude,
    })
    const confirmedPosition = await publishPosition(delivery, state.position)
    reconcileConfirmedPosition(state, confirmedPosition)
    return
  }

  if (delivery.status === 'picked_up') {
    const confirmedPosition = await publishPosition(delivery, state.position)
    reconcileConfirmedPosition(state, confirmedPosition)
    return
  }

  if (delivery.status === 'on_the_way') {
    await moveTowards(state, {
      latitude: delivery.customerLatitude,
      longitude: delivery.customerLongitude,
    })
    const confirmedPosition = await publishPosition(delivery, state.position)
    reconcileConfirmedPosition(state, confirmedPosition)
  }
}

async function tick() {
  if (isTickRunning || isStopping) return
  isTickRunning = true

  try {
    const deliveries = await driverRepository.listLocalDemoActiveDeliveries()
    const activeDeliveryIds = new Set(deliveries.map((delivery) => delivery.id))

    for (const [deliveryId, state] of states) {
      if (!activeDeliveryIds.has(deliveryId)) {
        states.delete(deliveryId)
        await redisService.clearDriverSimulatorLease(state.courierId).catch(() => undefined)
      }
    }

    for (const delivery of deliveries) {
      await advanceDelivery(delivery)
    }
  } catch (error) {
    trackError('local_delivery_demo_worker_failed', error)
  } finally {
    isTickRunning = false
  }
}

export function startLocalDeliveryDemoWorker() {
  if (!env.localDeliveryDemo.enabled || timer) return

  isStopping = false
  logEvent('info', 'local_delivery_demo_worker_started', {
    intervalMs: env.localDeliveryDemo.intervalMs,
    stepMeters: env.localDeliveryDemo.stepMeters,
  })
  void tick()
  timer = setInterval(() => void tick(), env.localDeliveryDemo.intervalMs)
  timer.unref()
}

export function stopLocalDeliveryDemoWorker() {
  if (!timer) return

  isStopping = true
  clearInterval(timer)
  timer = null
  const courierIds = [...new Set([...states.values()].map((state) => state.courierId))]
  states.clear()
  void Promise.all(courierIds.map((courierId) => redisService.clearDriverSimulatorLease(courierId).catch(() => undefined)))
}
