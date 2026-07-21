import { createClient, type RedisClientType } from 'redis'
import { env } from '../config/env'
import type { DriverProfile } from '../types/driver'

const cachePrefix = 'voro:cache:'
const rateLimitPrefix = 'voro:rate-limit:'
const dispatchQueueKey = 'voro:dispatch:queue'
const driverGeoKey = 'voro:drivers:geo'
const driverPresenceTtlSeconds = 50

type LiveDriver = Pick<DriverProfile, 'id' | 'name' | 'vehicleType' | 'isAvailable' | 'isOnline'> & {
  currentLatitude: number
  currentLongitude: number
}

let client: RedisClientType | null = null
let connectPromise: Promise<void> | null = null

function redisClient() {
  if (!client) {
    client = createClient({ url: env.redisUrl })
    client.on('error', (error) => console.error('Redis error:', error.message))
  }

  return client
}

export async function connectRedis() {
  const nextClient = redisClient()

  if (nextClient.isOpen) return
  if (!connectPromise) {
    connectPromise = nextClient.connect().then(() => undefined).finally(() => {
      connectPromise = null
    })
  }

  await connectPromise
  await nextClient.ping()
}

export async function disconnectRedis() {
  if (client?.isOpen) await client.quit()
}

async function getClient() {
  await connectRedis()
  return redisClient()
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const nextClient = await getClient()
  const cacheKey = `${cachePrefix}${key}`
  const value = await nextClient.get(cacheKey)

  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    await nextClient.del(cacheKey)
    return null
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  await (await getClient()).set(`${cachePrefix}${key}`, JSON.stringify(value), { EX: ttlSeconds })
}

export async function getOrSetCachedJson<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
) {
  const cached = await getCachedJson<T>(key)
  if (cached !== null) return cached

  const value = await factory()
  await setCachedJson(key, value, ttlSeconds)
  return value
}

export async function deleteCached(key: string) {
  await (await getClient()).del(`${cachePrefix}${key}`)
}

export async function deleteCachedByPrefix(prefix: string) {
  const nextClient = await getClient()
  const keys: string[] = []

  for await (const batch of nextClient.scanIterator({ MATCH: `${cachePrefix}${prefix}*`, COUNT: 100 })) {
    keys.push(...batch)
  }

  if (keys.length > 0) await nextClient.del(keys)
}

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const nextClient = await getClient()
  const rateLimitKey = `${rateLimitPrefix}${key}`
  const count = await nextClient.incr(rateLimitKey)

  if (count === 1) {
    await nextClient.expire(rateLimitKey, windowSeconds)
  }

  const ttlSeconds = Math.max(1, await nextClient.ttl(rateLimitKey))
  return { count, limit, ttlSeconds }
}

export async function enqueueDispatch(orderId: number) {
  await (await getClient()).lPush(dispatchQueueKey, String(orderId))
}

export async function dequeueDispatchBatch(max = 25) {
  const nextClient = await getClient()
  const orderIds: number[] = []

  while (orderIds.length < max) {
    const value = await nextClient.rPop(dispatchQueueKey)
    if (!value) break

    const orderId = Number(value)
    if (Number.isInteger(orderId) && orderId > 0) orderIds.push(orderId)
  }

  return orderIds
}

function presenceKey(driverId: number) {
  return `voro:driver:presence:${driverId}`
}

function simulatorKey(driverId: number) {
  return `voro:driver:simulator:${driverId}`
}

function parseLiveDriver(payload: string | null): LiveDriver | null {
  if (!payload) return null

  try {
    const driver = JSON.parse(payload) as LiveDriver
    return driver.isOnline ? driver : null
  } catch {
    return null
  }
}

export async function syncDriverPresence(driver: DriverProfile) {
  const nextClient = await getClient()
  const latitude = driver.currentLatitude
  const longitude = driver.currentLongitude

  if (!driver.isOnline || latitude === null || longitude === null) {
    await nextClient.multi().del(presenceKey(driver.id)).zRem(driverGeoKey, String(driver.id)).exec()
    return
  }

  const liveDriver: LiveDriver = {
    id: driver.id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    isAvailable: driver.isAvailable,
    isOnline: driver.isOnline,
    currentLatitude: latitude,
    currentLongitude: longitude,
  }

  await nextClient
    .multi()
    .set(presenceKey(driver.id), JSON.stringify(liveDriver), { EX: driverPresenceTtlSeconds })
    .geoAdd(driverGeoKey, {
      longitude,
      latitude,
      member: String(driver.id),
    })
    .exec()
}

export async function removeDriverPresence(driverId: number) {
  await (await getClient()).multi().del(presenceKey(driverId)).zRem(driverGeoKey, String(driverId)).exec()
}

export async function getLiveDriver(driverId: number) {
  return parseLiveDriver(await (await getClient()).get(presenceKey(driverId)))
}

export async function refreshDriverSimulatorLease(driverId: number, ttlSeconds: number) {
  await (await getClient()).set(simulatorKey(driverId), 'active', { EX: ttlSeconds })
}

export async function isDriverSimulatorActive(driverId: number) {
  return Boolean(await (await getClient()).get(simulatorKey(driverId)))
}

export async function clearDriverSimulatorLease(driverId: number) {
  await (await getClient()).del(simulatorKey(driverId))
}

export async function invalidateRestaurantCatalog(restaurantId?: number) {
  await Promise.all([
    restaurantId ? deleteCached(`catalog:menu:${restaurantId}`) : Promise.resolve(),
    deleteCachedByPrefix('catalog:discovery:'),
  ])
}

export async function listNearbyLiveDrivers(latitude: number, longitude: number, radiusMeters: number) {
  const nextClient = await getClient()
  const members = (await nextClient.sendCommand([
    'GEOSEARCH',
    driverGeoKey,
    'FROMLONLAT',
    String(longitude),
    String(latitude),
    'BYRADIUS',
    String(radiusMeters / 1000),
    'km',
    'ASC',
    'COUNT',
    '100',
  ])) as string[]

  if (members.length === 0) return [] as LiveDriver[]
  const payloads = await nextClient.mGet(members.map((member) => presenceKey(Number(member))))

  return payloads.flatMap((payload) => {
    const driver = parseLiveDriver(payload)
    return driver?.isAvailable ? [driver] : []
  })
}

export async function isRedisHealthy() {
  return (await (await getClient()).ping()) === 'PONG'
}
