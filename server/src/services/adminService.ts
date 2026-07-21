import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import * as adminRepository from '../repositories/adminRepository'
import * as authRepository from '../repositories/authRepository'
import * as driverRepository from '../repositories/driverRepository'
import * as geocodingService from './geocodingService'
import * as redisService from './redisService'
import * as operationsRepository from '../repositories/operationsRepository'
import { notifyUser } from './notificationService'
import * as restaurantAuthRepository from '../repositories/restaurantAuthRepository'
import * as restaurantRepository from '../repositories/restaurantRepository'
import * as restaurantAuthService from './restaurantAuthService'
import type {
  AdminRestaurantUpdatePayload,
  CreateCourierPayload,
} from '../types/admin'
import type { CreateRestaurantPayload } from '../types/restaurant'
import { HttpError } from '../utils/httpError'
import { generateOtp } from '../utils/otp'

function validateNameEmail(name: string, email: string) {
  if (!name || !email) {
    throw new HttpError(400, 'Name and email are required.')
  }

  if (!email.includes('@')) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
}

function assertId(id: number, message: string) {
  if (!id) {
    throw new HttpError(400, message)
  }
}

async function issuePasswordSetupCode(userId: number) {
  const setupCode = generateOtp()
  const setupCodeHash = await bcrypt.hash(setupCode, 10)

  await authRepository.savePasswordResetCode({
    userId,
    codeHash: setupCodeHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return setupCode
}

export async function getDashboardStats() {
  return adminRepository.getStats()
}

export async function getOverview() {
  const [stats, restaurants, users, orders, orderVolume, revenueVolume, orderStatusDistribution] = await Promise.all([
    adminRepository.getStats(),
    restaurantRepository.listRestaurants(),
    adminRepository.listUsers(),
    adminRepository.listOrders(),
    adminRepository.getOrderVolumeByDay(),
    adminRepository.getRevenueVolumeByDay(),
    adminRepository.getOrderStatusDistribution(),
  ])

  return {
    stats,
    recentRestaurants: restaurants.slice(0, 5),
    recentUsers: users.slice(0, 5),
    recentOrders: orders.slice(0, 8),
    orderVolume,
    revenueVolume,
    orderStatusDistribution,
  }
}

export function listUsers() {
  return adminRepository.listUsers()
}

export async function getUser(userId: number) {
  assertId(userId, 'User id is required.')
  const user = await adminRepository.findUserById(userId)

  if (!user) {
    throw new HttpError(404, 'User not found.')
  }

  return user
}

export async function updateUserStatus(userId: number, isActive: boolean, adminUserId: number) {
  assertId(userId, 'User id is required.')

  if (userId === adminUserId && !isActive) {
    throw new HttpError(400, 'You cannot block your own admin account.')
  }

  const user = await adminRepository.updateUserStatus(userId, isActive)

  if (!user) {
    throw new HttpError(404, 'User not found.')
  }

  if (user.role === 'courier' && !isActive) {
    const courier = await driverRepository.findDriverByUserId(user.id)
    if (courier) await redisService.removeDriverPresence(courier.id)
  }

  return user
}

export function listRestaurants() {
  return restaurantRepository.listRestaurants()
}

export function listRestaurantCategories() {
  return restaurantRepository.listRestaurantCategories()
}

export async function getRestaurant(restaurantId: number) {
  assertId(restaurantId, 'Restaurant id is required.')
  const restaurant = await restaurantRepository.findRestaurantById(restaurantId)

  if (!restaurant) {
    throw new HttpError(404, 'Restaurant not found.')
  }

  return restaurant
}

export async function getRestaurantAnalytics(restaurantId: number) {
  const restaurant = await getRestaurant(restaurantId)
  const [summary, dailyRevenue, recentOrders] = await Promise.all([
    adminRepository.getRestaurantRevenueSummary(restaurantId),
    adminRepository.getRestaurantRevenueByDay(restaurantId),
    adminRepository.listRecentRestaurantOrders(restaurantId),
  ])

  return { restaurant, summary, dailyRevenue, recentOrders }
}

export async function createRestaurant(payload: CreateRestaurantPayload) {
  validateNameEmail(payload.contactName, payload.contactEmail)

  if (!payload.restaurantName) {
    throw new HttpError(400, 'Restaurant name is required.')
  }

  if (!payload.address) {
    throw new HttpError(400, 'Restaurant address is required.')
  }

  const existingUser = await restaurantAuthRepository.findRestaurantUserByEmail(payload.contactEmail)

  if (existingUser) {
    throw new HttpError(409, 'An account with this email already exists.')
  }

  const contactPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10)
  const location = await geocodingService.geocodeAddress(payload.address)
  const result = await restaurantRepository.createRestaurantWithAccount({
    ...payload,
    latitude: location.latitude,
    longitude: location.longitude,
    contactPasswordHash,
  })
  const setup = await restaurantAuthService.issuePasswordSetupCode(result.restaurant.id)
  await redisService.invalidateRestaurantCatalog()

  return {
    restaurant: result.restaurant,
    operator: setup.user,
    setupCode: setup.setupCode,
  }
}

export async function resolveRestaurantLocation(address: string) {
  return { location: await geocodingService.geocodeAddress(address) }
}

export async function searchRestaurantAddressSuggestions(query: string) {
  return { suggestions: await geocodingService.searchAddressSuggestions(query) }
}

export async function updateRestaurant(
  restaurantId: number,
  payload: AdminRestaurantUpdatePayload,
) {
  assertId(restaurantId, 'Restaurant id is required.')

  if (!payload.name) {
    throw new HttpError(400, 'Restaurant name is required.')
  }

  const restaurant = await restaurantRepository.updateRestaurant(restaurantId, payload)

  if (!restaurant) {
    throw new HttpError(404, 'Restaurant not found.')
  }

  await redisService.invalidateRestaurantCatalog(restaurant.id)

  return restaurant
}

export async function updateRestaurantStatus(restaurantId: number, isActive: boolean) {
  assertId(restaurantId, 'Restaurant id is required.')
  const updatedRestaurant = await adminRepository.updateRestaurantStatus(restaurantId, isActive)
  const restaurant = updatedRestaurant
    ? await restaurantRepository.findRestaurantById(restaurantId)
    : null

  if (!restaurant) {
    throw new HttpError(404, 'Restaurant not found.')
  }

  await redisService.invalidateRestaurantCatalog(restaurant.id)

  return restaurant
}

export async function resetRestaurantAccess(restaurantId: number) {
  const restaurant = await getRestaurant(restaurantId)
  const setup = await restaurantAuthService.issuePasswordSetupCode(restaurant.id)

  return {
    restaurant,
    operator: setup.user,
    setupCode: setup.setupCode,
  }
}

export function listCouriers() {
  return adminRepository.listCouriers()
}

export async function getCourier(courierId: number) {
  assertId(courierId, 'Courier id is required.')
  const courier = await adminRepository.findCourierById(courierId)

  if (!courier) {
    throw new HttpError(404, 'Courier not found.')
  }

  return courier
}

export async function getCourierAnalytics(courierId: number) {
  const courier = await getCourier(courierId)
  const [summary, dailyEarnings, recentDeliveries] = await Promise.all([
    adminRepository.getDriverEarningsSummary(courierId),
    adminRepository.getDriverEarningsByDay(courierId),
    adminRepository.listRecentDriverDeliveries(courierId),
  ])

  return { courier, summary, dailyEarnings, recentDeliveries }
}

export async function createCourier(payload: CreateCourierPayload) {
  validateNameEmail(payload.name, payload.email)

  if (!payload.phone) {
    throw new HttpError(400, 'Courier phone is required.')
  }

  const existingUser = await authRepository.findUserByEmail(payload.email)

  if (existingUser) {
    throw new HttpError(409, 'An account with this email already exists.')
  }

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10)
  const courier = await adminRepository.createCourier({ ...payload, passwordHash })
  const setupCode = await issuePasswordSetupCode(courier.userId)

  return { courier, setupCode }
}

export async function updateCourierStatus(courierId: number, isAvailable: boolean) {
  assertId(courierId, 'Courier id is required.')
  const courier = await adminRepository.updateCourierStatus(courierId, isAvailable)

  if (!courier) {
    throw new HttpError(404, 'Courier not found.')
  }

  await redisService.syncDriverPresence(courier)

  return courier
}

export async function resetCourierPassword(courierId: number) {
  const courier = await getCourier(courierId)
  const setupCode = await issuePasswordSetupCode(courier.userId)

  return { courier, setupCode }
}

export function listOrders(status?: string) {
  return adminRepository.listOrders(status)
}

export async function getOrder(orderId: number) {
  assertId(orderId, 'Order id is required.')
  const order = await adminRepository.findOrderById(orderId)

  if (!order) {
    throw new HttpError(404, 'Order not found.')
  }

  return order
}

export async function getOperations() {
  const [orders, issues, couriers] = await Promise.all([
    operationsRepository.listActiveOperations(),
    operationsRepository.listOpenIssues(),
    adminRepository.listCouriers(),
  ])
  return { orders, issues, couriers }
}

export async function reassignOrder(orderId: number, courierId: number) {
  assertId(orderId, 'Order not found.')
  assertId(courierId, 'Courier not found.')
  const assignment = await operationsRepository.assignCourierToOrder(orderId, courierId)
  if (!assignment) {
    throw new HttpError(409, 'This order cannot be reassigned after pickup, or the courier is unavailable.')
  }

  await Promise.all([
    notifyUser(assignment.customerUserId, {
      type: 'courier_reassigned',
      title: `Courier updated for order #${orderId}`,
      body: `${assignment.courierName} is now assigned to your delivery.`,
      data: { orderId, courierId },
    }),
    notifyUser(assignment.courierUserId, {
      type: 'manual_assignment',
      title: `New delivery assignment #${orderId}`,
      body: 'Operations assigned this delivery to you. Open the app to start the route.',
      data: { orderId },
    }),
    operationsRepository.createRestaurantNotification(assignment.restaurantId, {
      type: 'courier_reassigned',
      title: `Courier updated for order #${orderId}`,
      body: `${assignment.courierName} is assigned to the delivery.`,
      data: { orderId, courierId },
    }),
  ])

  return { assigned: true }
}

export async function updateIssue(
  issueId: number,
  adminUserId: number,
  status: 'in_review' | 'resolved',
  resolutionNote: string,
) {
  assertId(issueId, 'Issue not found.')
  const issue = await operationsRepository.resolveIssue(issueId, adminUserId, status, resolutionNote)
  if (!issue) throw new HttpError(404, 'Issue not found.')

  await notifyUser(issue.reporterUserId, {
    type: 'issue_update',
    title: `Support update for order #${issue.orderId}`,
    body: status === 'resolved'
      ? (resolutionNote || 'Your report was resolved by Voro support.')
      : 'Voro support is reviewing your report.',
    data: { orderId: issue.orderId, issueId: issue.id, status },
  })
  return { issue }
}
