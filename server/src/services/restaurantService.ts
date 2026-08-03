import * as restaurantRepository from '../repositories/restaurantRepository'
import * as dispatchService from './dispatchService'
import * as redisService from './redisService'
import * as operationsRepository from '../repositories/operationsRepository'
import type {
  UpsertProductCategoryPayload,
  UpsertProductPayload,
} from '../types/restaurant'
import { HttpError } from '../utils/httpError'
import { sanitizePlainText } from '../utils/securityInput'
import { notifyUser } from './notificationService'

type RestaurantOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

const allowedNextStatuses: Record<RestaurantOrderStatus, RestaurantOrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: [],
  picked_up: [],
  delivered: [],
  cancelled: [],
}

const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function calendarMonthRange(value: unknown) {
  const month = String(value || '')
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new HttpError(400, 'Month must use YYYY-MM format.')
  }

  const [year, monthNumber] = month.split('-').map(Number)
  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1)),
    to: new Date(Date.UTC(year, monthNumber, 1)),
  }
}

function normalizedProductPayload(payload: UpsertProductPayload): UpsertProductPayload {
  const imageUrl = sanitizePlainText(payload.imageUrl, 2_000)
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    throw new HttpError(400, 'Product image URL must use http or https.')
  }

  return {
    ...payload,
    name: sanitizePlainText(payload.name, 160),
    description: sanitizePlainText(payload.description, 2_000),
    imageUrl,
  }
}

function validTime(value: unknown) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))
}

function normalizeOperations(payload: Record<string, unknown>) {
  const deliveryRadiusKm = Number(payload.deliveryRadiusKm)
  if (!Number.isFinite(deliveryRadiusKm) || deliveryRadiusKm <= 0 || deliveryRadiusKm > 50) {
    throw new HttpError(400, 'Delivery radius must be between 0.1 and 50 km.')
  }
  if (!payload.openingHours || typeof payload.openingHours !== 'object' || Array.isArray(payload.openingHours)) {
    throw new HttpError(400, 'Opening hours are required.')
  }

  const rawHours = payload.openingHours as Record<string, unknown>
  const openingHours = Object.fromEntries(
    weekdays.map((day) => {
      const raw = rawHours[day]
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new HttpError(400, `Opening hours for ${day} are invalid.`)
      }
      const value = raw as Record<string, unknown>
      const enabled = value.enabled !== false
      const open = String(value.open || '')
      const close = String(value.close || '')
      if (enabled && (!validTime(open) || !validTime(close))) {
        throw new HttpError(400, `Opening hours for ${day} must use HH:MM.`)
      }
      return [day, { enabled, open: validTime(open) ? open : '00:00', close: validTime(close) ? close : '23:59' }]
    }),
  )

  return {
    deliveryRadiusKm: Math.round(deliveryRadiusKm * 10) / 10,
    openingHours,
    isAcceptingOrders: payload.isAcceptingOrders !== false,
    preparationMinutes: (() => {
      const value = Number(payload.preparationMinutes)
      if (!Number.isInteger(value) || value < 5 || value > 180) {
        throw new HttpError(400, 'Preparation time must be between 5 and 180 minutes.')
      }
      return value
    })(),
    busyUntil: (() => {
      if (!payload.busyUntil) return null
      const value = new Date(String(payload.busyUntil))
      if (Number.isNaN(value.getTime()) || value <= new Date()) {
        throw new HttpError(400, 'Busy-until time must be in the future.')
      }
      return value
    })(),
    autoAcceptOrders: payload.autoAcceptOrders === true,
  }
}

async function getRestaurantScope(restaurantId: number) {
  const restaurant = await restaurantRepository.findRestaurantById(restaurantId)

  if (!restaurant || !restaurant.isActive) {
    throw new HttpError(404, 'Restaurant console is not linked to an active restaurant.')
  }

  return restaurant
}

export async function getDashboard(restaurantId: number) {
  const restaurant = await getRestaurantScope(restaurantId)
  const [categories, products, orders, notifications] = await Promise.all([
    restaurantRepository.listProductCategories(restaurant.id),
    restaurantRepository.listProducts(restaurant.id),
    restaurantRepository.listRestaurantOrders(restaurant.id),
    operationsRepository.listRestaurantNotifications(restaurant.id),
  ])

  return {
    restaurant,
    categories,
    products,
    orders,
    notifications,
    unreadNotifications: notifications.filter((notification) => !notification.readAt).length,
  }
}

export async function getCompletedOrders(restaurantId: number, month: unknown) {
  const restaurant = await getRestaurantScope(restaurantId)
  const { from, to } = calendarMonthRange(month)
  const orders = await restaurantRepository.listRestaurantCompletedOrders(restaurant.id, from, to)
  return { orders }
}

export async function updateOrderStatus(restaurantId: number, orderId: number, nextStatus: string) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'Order not found.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const currentStatus = await restaurantRepository.getRestaurantOrderStatus(restaurant.id, orderId)

  if (!currentStatus) {
    throw new HttpError(404, 'Order not found.')
  }

  const allowed = allowedNextStatuses[currentStatus as RestaurantOrderStatus]

  if (!allowed || !allowed.includes(nextStatus as RestaurantOrderStatus)) {
    throw new HttpError(400, 'This order cannot move to that status.')
  }

  const order = await restaurantRepository.updateRestaurantOrderStatus(
    restaurant.id,
    orderId,
    nextStatus,
  )

  if (!order) {
    throw new HttpError(404, 'Order not found.')
  }

  if (nextStatus === 'accepted') {
    // Matching starts as soon as the restaurant accepts; food preparation does not wait for it.
    dispatchService.enqueueDispatch(orderId)
  }

  const owner = await operationsRepository.getOrderOwner(orderId)
  if (owner) {
    await notifyUser(Number(owner.user_id), {
      type: 'order_status',
      title: `Order #${orderId}: ${nextStatus.replace('_', ' ')}`,
      body: nextStatus === 'cancelled'
        ? 'The restaurant could not accept this order.'
        : `The restaurant updated your order to ${nextStatus.replace('_', ' ')}.`,
      data: { orderId, status: nextStatus },
    })
  }

  return { order }
}

export async function updateOperations(restaurantId: number, payload: Record<string, unknown>) {
  const restaurant = await getRestaurantScope(restaurantId)
  const operations = await operationsRepository.updateRestaurantOperations(restaurant.id, normalizeOperations(payload))
  if (!operations) throw new HttpError(404, 'Restaurant not found.')
  await redisService.invalidateRestaurantCatalog(restaurant.id)
  return { operations }
}

export async function getNotifications(restaurantId: number) {
  const restaurant = await getRestaurantScope(restaurantId)
  const notifications = await operationsRepository.listRestaurantNotifications(restaurant.id)
  return { notifications, unreadCount: notifications.filter((notification) => !notification.readAt).length }
}

export async function readNotification(restaurantId: number, notificationId: number) {
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    throw new HttpError(400, 'Notification not found.')
  }
  const restaurant = await getRestaurantScope(restaurantId)
  if (!(await operationsRepository.markRestaurantNotificationRead(restaurant.id, notificationId))) {
    throw new HttpError(404, 'Notification not found.')
  }
  return { read: true }
}

export async function createCategory(
  restaurantId: number,
  payload: UpsertProductCategoryPayload,
) {
  const normalizedPayload = {
    name: sanitizePlainText(payload.name, 160),
    description: sanitizePlainText(payload.description, 2_000),
  }
  if (!normalizedPayload.name) {
    throw new HttpError(400, 'Category name is required.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const category = await restaurantRepository.createProductCategory(restaurant.id, normalizedPayload)
  const categories = await restaurantRepository.listProductCategories(restaurant.id)
  await redisService.invalidateRestaurantCatalog(restaurant.id)

  return { category, categories }
}

export async function createProduct(restaurantId: number, payload: UpsertProductPayload) {
  const normalizedPayload = normalizedProductPayload(payload)
  if (!normalizedPayload.name) {
    throw new HttpError(400, 'Product name is required.')
  }

  if (!Number.isFinite(normalizedPayload.price) || normalizedPayload.price < 0) {
    throw new HttpError(400, 'Product price must be zero or greater.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const product = await restaurantRepository.createProduct(restaurant.id, normalizedPayload)
  const products = await restaurantRepository.listProducts(restaurant.id)
  await redisService.invalidateRestaurantCatalog(restaurant.id)

  return { product, products }
}

export async function updateProduct(
  restaurantId: number,
  productId: number,
  payload: UpsertProductPayload,
) {
  const normalizedPayload = normalizedProductPayload(payload)
  if (!normalizedPayload.name) {
    throw new HttpError(400, 'Product name is required.')
  }

  if (!Number.isFinite(normalizedPayload.price) || normalizedPayload.price < 0) {
    throw new HttpError(400, 'Product price must be zero or greater.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const product = await restaurantRepository.updateProduct(restaurant.id, productId, normalizedPayload)

  if (!product) {
    throw new HttpError(404, 'Product not found.')
  }

  const products = await restaurantRepository.listProducts(restaurant.id)
  await redisService.invalidateRestaurantCatalog(restaurant.id)

  return { product, products }
}
