import * as restaurantRepository from '../repositories/restaurantRepository'
import * as dispatchService from './dispatchService'
import type {
  UpsertProductCategoryPayload,
  UpsertProductPayload,
} from '../types/restaurant'
import { HttpError } from '../utils/httpError'

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
  ready: ['picked_up'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: [],
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
  const [categories, products, orders] = await Promise.all([
    restaurantRepository.listProductCategories(restaurant.id),
    restaurantRepository.listProducts(restaurant.id),
    restaurantRepository.listRestaurantOrders(restaurant.id),
  ])

  return { restaurant, categories, products, orders }
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

  if (nextStatus === 'preparing') {
    // This is intentionally not awaited: food preparation must never wait for matching.
    dispatchService.enqueueDispatch(orderId)
  }

  return { order }
}

export async function createCategory(
  restaurantId: number,
  payload: UpsertProductCategoryPayload,
) {
  if (!payload.name) {
    throw new HttpError(400, 'Category name is required.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const category = await restaurantRepository.createProductCategory(restaurant.id, payload)
  const categories = await restaurantRepository.listProductCategories(restaurant.id)

  return { category, categories }
}

export async function createProduct(restaurantId: number, payload: UpsertProductPayload) {
  if (!payload.name) {
    throw new HttpError(400, 'Product name is required.')
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    throw new HttpError(400, 'Product price must be zero or greater.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const product = await restaurantRepository.createProduct(restaurant.id, payload)
  const products = await restaurantRepository.listProducts(restaurant.id)

  return { product, products }
}

export async function updateProduct(
  restaurantId: number,
  productId: number,
  payload: UpsertProductPayload,
) {
  if (!payload.name) {
    throw new HttpError(400, 'Product name is required.')
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    throw new HttpError(400, 'Product price must be zero or greater.')
  }

  const restaurant = await getRestaurantScope(restaurantId)
  const product = await restaurantRepository.updateProduct(restaurant.id, productId, payload)

  if (!product) {
    throw new HttpError(404, 'Product not found.')
  }

  const products = await restaurantRepository.listProducts(restaurant.id)

  return { product, products }
}
