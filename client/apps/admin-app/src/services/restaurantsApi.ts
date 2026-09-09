import type {
  CreateRestaurantPayload,
  Restaurant,
  RestaurantCategory,
  UpdateRestaurantPayload,
} from '../types/restaurant'
import type { RestaurantAnalytics } from '../types/analytics'
import { apiRequest } from './apiClient'

export function listRestaurants() {
  return apiRequest<{ restaurants: Restaurant[] }>('/admin/restaurants')
}

export function listRestaurantCategories() {
  return apiRequest<{ categories: RestaurantCategory[] }>('/admin/restaurant-categories')
}

export function getRestaurant(restaurantId: number) {
  return apiRequest<{ restaurant: Restaurant }>(`/admin/restaurants/${restaurantId}`)
}

export function getRestaurantAnalytics(restaurantId: number) {
  return apiRequest<RestaurantAnalytics>(`/admin/restaurants/${restaurantId}/analytics`)
}

export function createRestaurant(payload: CreateRestaurantPayload) {
  return apiRequest<{
    restaurant: Restaurant
    operator: { id: number; name: string; email: string }
    setupCode: string
    setupUrl: string
    inviteEmailSent: boolean
  }>('/admin/restaurants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resolveRestaurantLocation(address: string) {
  return apiRequest<{ location: { latitude: number; longitude: number; displayName: string } }>('/admin/restaurant-location', {
    method: 'POST',
    body: JSON.stringify({ address }),
  })
}

export function updateRestaurant(restaurantId: number, payload: UpdateRestaurantPayload) {
  return apiRequest<{ restaurant: Restaurant }>(`/admin/restaurants/${restaurantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateRestaurantStatus(restaurantId: number, isActive: boolean) {
  return apiRequest<{ restaurant: Restaurant }>(`/admin/restaurants/${restaurantId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

export function resetRestaurantAccess(restaurantId: number) {
  return apiRequest<{
    restaurant: Restaurant
    operator: { id: number; name: string; email: string }
    setupCode: string
    setupUrl: string
    inviteEmailSent: boolean
  }>(`/admin/restaurants/${restaurantId}/password-reset`, {
    method: 'POST',
  })
}
