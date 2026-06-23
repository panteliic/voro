import * as restaurantRepository from '../repositories/restaurantRepository'
import type {
  UpsertProductCategoryPayload,
  UpsertProductPayload,
} from '../types/restaurant'
import { HttpError } from '../utils/httpError'

async function getOwnedRestaurant(userId: number) {
  const restaurant = await restaurantRepository.findRestaurantByOwner(userId)

  if (!restaurant) {
    throw new HttpError(404, 'Restaurant account is not linked to a restaurant.')
  }

  return restaurant
}

export async function getDashboard(userId: number) {
  const restaurant = await getOwnedRestaurant(userId)
  const [categories, products] = await Promise.all([
    restaurantRepository.listProductCategories(restaurant.id),
    restaurantRepository.listProducts(restaurant.id),
  ])

  return { restaurant, categories, products }
}

export async function createCategory(
  userId: number,
  payload: UpsertProductCategoryPayload,
) {
  if (!payload.name) {
    throw new HttpError(400, 'Category name is required.')
  }

  const restaurant = await getOwnedRestaurant(userId)
  const category = await restaurantRepository.createProductCategory(restaurant.id, payload)
  const categories = await restaurantRepository.listProductCategories(restaurant.id)

  return { category, categories }
}

export async function createProduct(userId: number, payload: UpsertProductPayload) {
  if (!payload.name) {
    throw new HttpError(400, 'Product name is required.')
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    throw new HttpError(400, 'Product price must be zero or greater.')
  }

  const restaurant = await getOwnedRestaurant(userId)
  const product = await restaurantRepository.createProduct(restaurant.id, payload)
  const products = await restaurantRepository.listProducts(restaurant.id)

  return { product, products }
}

export async function updateProduct(
  userId: number,
  productId: number,
  payload: UpsertProductPayload,
) {
  if (!payload.name) {
    throw new HttpError(400, 'Product name is required.')
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    throw new HttpError(400, 'Product price must be zero or greater.')
  }

  const restaurant = await getOwnedRestaurant(userId)
  const product = await restaurantRepository.updateProduct(restaurant.id, productId, payload)

  if (!product) {
    throw new HttpError(404, 'Product not found.')
  }

  const products = await restaurantRepository.listProducts(restaurant.id)

  return { product, products }
}
