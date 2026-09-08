import { pool } from '../database/pool'
import * as driverRepository from '../repositories/driverRepository'
import * as redisService from '../services/redisService'
import * as routingService from '../services/routingService'
import { env } from '../config/env'
import jwt from 'jsonwebtoken'

type Position = { latitude: number; longitude: number }

type SimulatorOptions = {
  driverEmail: string
  restaurantId: number | null
  restaurantName: string | null
  hasRestaurantOverride: boolean
  frontDistanceMeters: number
  stepMeters: number
  intervalMs: number
  ticks: number | null
}

type TargetDriver = {
  userId: number
  name: string
  email: string
  currentLatitude: number | null
  currentLongitude: number | null
}

type TargetRestaurant = {
  name: string
  latitude: number
  longitude: number
}

const defaultDriverEmail = 'marko.jovanovic@driver.voro.test'
const defaultRestaurantName = 'Domaće palačinke'
const metersPerLatitudeDegree = 111_320

function simulatorAccessToken(userId: number, email: string) {
  return jwt.sign(
    { userId, email, role: 'courier', type: 'access' },
    env.jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  )
}

async function publishSimulatedPresence(token: string, position: Position) {
  let response: Response

  try {
    response = await fetch(`${env.apiUrl}/driver/presence`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: true, latitude: position.latitude, longitude: position.longitude }),
    })
  } catch {
    throw new Error(`Cannot reach the API at ${env.apiUrl}. Start the API before running the simulator.`)
  }

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new Error(
        `Driver presence updates were rate-limited. Retry after ${retryAfter || 'a short wait'} ` +
          `or use a longer --interval value.`,
      )
    }

    throw new Error(`Driver presence request failed with ${response.status}.`)
  }
}

function argumentValue(name: string) {
  const position = process.argv.indexOf(name)
  return position >= 0 ? process.argv[position + 1] : undefined
}

function positiveNumber(value: string | undefined, fallback: number, label: string) {
  if (value === undefined) return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`)
  }

  return parsed
}

function parseOptions(): SimulatorOptions {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Moves one courier to the restaurant for its active delivery, then keeps the courier waiting there.
After the driver marks the delivery as "On the way", it follows the driving route to the customer.

Usage:
  npm run simulate:driver
  npm run simulate:driver -- --driver marko.jovanovic@driver.voro.test --restaurant-id 51
  npm run simulate:driver -- --restaurant "Domaće palačinke" --front-distance 30 --step 25
  npm run simulate:driver -- --once

Options:
  --driver <email>         Courier email (default: ${defaultDriverEmail})
  --restaurant <name>      Force an exact restaurant instead of the active delivery
  --restaurant-id <id>     Force a restaurant ID; takes precedence over --restaurant
  --front-distance <meters> Waiting position north of the restaurant (default: 30)
  --step <meters>          Distance travelled on each update (default: 10)
  --interval <milliseconds> Update interval (default: 1000)
  --ticks <count>          Stop after this many updates
  --once                   Send one location update and exit
  --help                   Show this help
`)
    process.exit(0)
  }

  const restaurantId = argumentValue('--restaurant-id')
  const restaurantName = argumentValue('--restaurant')
  const ticks = process.argv.includes('--once')
    ? 1
    : argumentValue('--ticks') === undefined
      ? null
      : Math.floor(positiveNumber(argumentValue('--ticks'), 1, '--ticks'))

  return {
    driverEmail: argumentValue('--driver') || defaultDriverEmail,
    restaurantId: restaurantId ? Math.floor(positiveNumber(restaurantId, 1, '--restaurant-id')) : null,
    restaurantName: restaurantId ? null : restaurantName || null,
    hasRestaurantOverride: Boolean(restaurantId || restaurantName),
    frontDistanceMeters: positiveNumber(argumentValue('--front-distance'), 30, '--front-distance'),
    stepMeters: positiveNumber(argumentValue('--step'), 10, '--step'),
    intervalMs: positiveNumber(argumentValue('--interval'), 1_000, '--interval'),
    ticks,
  }
}

async function findTargetDriver(email: string): Promise<TargetDriver> {
  const result = await pool.query<{
    user_id: string
    name: string
    email: string
    current_latitude: string | null
    current_longitude: string | null
  }>(
    `
      SELECT courier.user_id, "user".name, "user".email, courier.current_latitude, courier.current_longitude
      FROM courier
      INNER JOIN "user" ON "user".id = courier.user_id
      WHERE LOWER("user".email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  )
  const driver = result.rows[0]

  if (!driver) {
    throw new Error(`No courier was found for ${email}.`)
  }

  return {
    userId: Number(driver.user_id),
    name: driver.name,
    email: driver.email,
    currentLatitude: driver.current_latitude === null ? null : Number(driver.current_latitude),
    currentLongitude: driver.current_longitude === null ? null : Number(driver.current_longitude),
  }
}

async function findTargetRestaurant(options: SimulatorOptions): Promise<TargetRestaurant> {
  const result = await pool.query<{ name: string; latitude: string; longitude: string }>(
    `
      SELECT name, latitude, longitude
      FROM restaurant
      WHERE (
        ($1::BIGINT IS NOT NULL AND id = $1::BIGINT)
        OR ($1::BIGINT IS NULL AND LOWER(name) = LOWER($2))
      )
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      LIMIT 1
    `,
    [options.restaurantId, options.restaurantName || defaultRestaurantName],
  )
  const restaurant = result.rows[0]

  if (!restaurant) {
    throw new Error(`Restaurant was not found. Use --restaurant-id or an exact --restaurant name.`)
  }

  return {
    name: restaurant.name,
    latitude: Number(restaurant.latitude),
    longitude: Number(restaurant.longitude),
  }
}

function restaurantForDelivery(delivery: {
  restaurantName: string
  restaurantLatitude: number
  restaurantLongitude: number
}): TargetRestaurant {
  return {
    name: delivery.restaurantName,
    latitude: delivery.restaurantLatitude,
    longitude: delivery.restaurantLongitude,
  }
}

function frontOfRestaurant(restaurant: TargetRestaurant, distanceMeters: number) {
  return {
    latitude: restaurant.latitude + distanceMeters / metersPerLatitudeDegree,
    longitude: restaurant.longitude,
  }
}

function distanceMeters(first: Position, second: Position) {
  const earthRadius = 6_371_000
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((first.latitude * Math.PI) / 180) * Math.cos((second.latitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function moveAlongRoute(current: Position, routePoints: Position[], nextPointIndex: number, maxStepMeters: number) {
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

async function main() {
  if (env.isProduction) {
    throw new Error('The driver location simulator is only available outside production.')
  }

  const options = parseOptions()
  const targetDriver = await findTargetDriver(options.driverEmail)
  const driverProfile = await driverRepository.findDriverByUserId(targetDriver.userId)
  if (!driverProfile) {
    throw new Error(`Courier profile for ${targetDriver.email} no longer exists.`)
  }

  const accessToken = simulatorAccessToken(targetDriver.userId, targetDriver.email)
  const initialActiveDelivery = (await driverRepository.listActiveDeliveries(driverProfile.id))[0] || null
  let targetRestaurant = options.hasRestaurantOverride || !initialActiveDelivery
    ? await findTargetRestaurant(options)
    : restaurantForDelivery(initialActiveDelivery)

  const simulatorLeaseSeconds = Math.max(5, Math.ceil((options.intervalMs * 3) / 1_000))
  let tick = 0
  let waitingPoint = frontOfRestaurant(targetRestaurant, options.frontDistanceMeters)
  let currentPoint =
    targetDriver.currentLatitude !== null && targetDriver.currentLongitude !== null
      ? { latitude: targetDriver.currentLatitude, longitude: targetDriver.currentLongitude }
      : {
          latitude: targetRestaurant.latitude - 0.0025,
          longitude: targetRestaurant.longitude - 0.0015,
        }
  let isWaitingAtRestaurant = distanceMeters(currentPoint, waitingPoint) < 1
  let restaurantRoute: Position[] | null = null
  let restaurantRoutePointIndex = 1
  let deliveryRoute: Position[] | null = null
  let deliveryRouteId: number | null = null
  let deliveryRoutePointIndex = 1
  let isWaitingAtCustomer = false
  let trackedActiveDeliveryId = initialActiveDelivery?.id || null
  let timeout: NodeJS.Timeout | null = null
  let stopping = false

  const stop = async (exitCode: number) => {
    if (stopping) return
    stopping = true
    if (timeout) clearTimeout(timeout)
    await redisService.clearDriverSimulatorLease(driverProfile.id).catch(() => undefined)
    await redisService.disconnectRedis().catch(() => undefined)
    await pool.end().catch(() => undefined)
    process.exitCode = exitCode
  }

  const updateLocation = async () => {
    // The API owns the database/Redis update and Socket.IO broadcast. Briefly
    // release the local lease so the simulator request itself is accepted.
    await redisService.clearDriverSimulatorLease(driverProfile.id)
    const activeDelivery = (await driverRepository.listActiveDeliveries(driverProfile.id))[0] || null

    if (!options.hasRestaurantOverride && activeDelivery) {
      const activeRestaurant = restaurantForDelivery(activeDelivery)
      const activeDeliveryChanged = trackedActiveDeliveryId !== activeDelivery.id
      if (activeDeliveryChanged || distanceMeters(targetRestaurant, activeRestaurant) >= 1) {
        targetRestaurant = activeRestaurant
        waitingPoint = frontOfRestaurant(targetRestaurant, options.frontDistanceMeters)
        isWaitingAtRestaurant = distanceMeters(currentPoint, waitingPoint) < 1
        isWaitingAtCustomer = false
        restaurantRoute = null
        restaurantRoutePointIndex = 1
        trackedActiveDeliveryId = activeDelivery.id
        console.log(`Active delivery #${activeDelivery.orderId} selected: heading to ${targetRestaurant.name}.`)
      }
    }

    let movementLabel = 'waiting in front'
    let arrivedAtRestaurantNow = false
    let arrivedAtCustomerNow = false

    if (activeDelivery?.status === 'on_the_way') {
      if (deliveryRouteId !== activeDelivery.id) {
        const route = await routingService.findDrivingRoute(
          currentPoint,
          { latitude: activeDelivery.customerLatitude, longitude: activeDelivery.customerLongitude },
        )
        deliveryRoute = [currentPoint, ...route.coordinates.slice(1).map(([latitude, longitude]) => ({ latitude, longitude }))]
        deliveryRouteId = activeDelivery.id
        deliveryRoutePointIndex = 1
        isWaitingAtCustomer = false
        console.log(`Delivery #${activeDelivery.id} is on the way. Following the driving route to ${activeDelivery.customerName}.`)
      }

      const nextLocation = isWaitingAtCustomer
        ? { point: currentPoint, nextPointIndex: deliveryRoutePointIndex, arrived: true }
        : moveAlongRoute(currentPoint, deliveryRoute || [currentPoint], deliveryRoutePointIndex, options.stepMeters)
      currentPoint = nextLocation.point
      deliveryRoutePointIndex = nextLocation.nextPointIndex
      arrivedAtCustomerNow = !isWaitingAtCustomer && nextLocation.arrived
      isWaitingAtCustomer = nextLocation.arrived
      movementLabel = isWaitingAtCustomer ? 'waiting at customer' : 'heading to customer'
    } else {
      deliveryRoute = null
      deliveryRouteId = null
      deliveryRoutePointIndex = 1

      if (isWaitingAtCustomer && !activeDelivery) {
        movementLabel = 'waiting after delivery'
      } else {
        isWaitingAtCustomer = false
        if (!isWaitingAtRestaurant && !restaurantRoute) {
          const route = await routingService.findDrivingRoute(currentPoint, waitingPoint)
          restaurantRoute = [currentPoint, ...route.coordinates.slice(1).map(([latitude, longitude]) => ({ latitude, longitude }))]
          restaurantRoutePointIndex = 1
          console.log(`Following the driving route to ${targetRestaurant.name}.`)
        }

        const nextLocation = isWaitingAtRestaurant
          ? { point: waitingPoint, nextPointIndex: restaurantRoutePointIndex, arrived: true }
          : moveAlongRoute(currentPoint, restaurantRoute || [currentPoint], restaurantRoutePointIndex, options.stepMeters)
        currentPoint = nextLocation.point
        restaurantRoutePointIndex = nextLocation.nextPointIndex
        arrivedAtRestaurantNow = !isWaitingAtRestaurant && nextLocation.arrived
        isWaitingAtRestaurant = nextLocation.arrived
        movementLabel = isWaitingAtRestaurant ? 'waiting in front' : 'heading to restaurant'
      }
    }

    await publishSimulatedPresence(accessToken, currentPoint)
    await redisService.refreshDriverSimulatorLease(driverProfile.id, simulatorLeaseSeconds)
    tick += 1

    console.log(
      `[${new Date().toLocaleTimeString()}] ${targetDriver.name} -> ${targetRestaurant.name}: ` +
        `${currentPoint.latitude.toFixed(6)}, ${currentPoint.longitude.toFixed(6)} ` +
        `(${movementLabel}${options.ticks ? `, ${tick}/${options.ticks}` : ''})`,
    )

    if (arrivedAtRestaurantNow) {
      console.log(`${targetDriver.name} arrived in front of ${targetRestaurant.name} and will stay there.`)
    }
    if (arrivedAtCustomerNow) {
      console.log(`${targetDriver.name} arrived at ${activeDelivery?.customerName} and will stay there.`)
    }

    if (options.ticks !== null && tick >= options.ticks) {
      await stop(0)
      return
    }

    timeout = setTimeout(() => {
      void updateLocation().catch(async (error) => {
        console.error('Driver location simulator failed.', error)
        await stop(1)
      })
    }, options.intervalMs)
  }

  process.once('SIGINT', () => void stop(0))
  process.once('SIGTERM', () => void stop(0))

  console.log(
    `Starting local driver simulator for ${targetDriver.name} to ${targetRestaurant.name} ` +
      `(${options.stepMeters}m every ${options.intervalMs}ms; waits ${options.frontDistanceMeters}m in front, then follows the customer route after On the way). Press Ctrl+C to stop.`,
  )
  if (!options.hasRestaurantOverride && initialActiveDelivery) {
    console.log(`Using active delivery #${initialActiveDelivery.orderId}; the restaurant will update automatically if Marko accepts another delivery.`)
  }
  await updateLocation()
}

void main().catch(async (error) => {
  console.error('Driver location simulator failed.', error)
  await redisService.disconnectRedis().catch(() => undefined)
  await pool.end().catch(() => undefined)
  process.exitCode = 1
})
