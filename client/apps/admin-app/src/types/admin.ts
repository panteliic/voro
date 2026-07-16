import type { Order } from './order'
import type { Restaurant } from './restaurant'
import type { AdminUser } from './user'

export type AdminStats = {
  users: number
  restaurants: number
  drivers: number
  orders: number
  activeOrders: number
  activeRestaurants: number
  availableDrivers: number
}

export type AdminOverview = {
  stats: AdminStats
  recentRestaurants: Restaurant[]
  recentUsers: AdminUser[]
  recentOrders: Order[]
  orderVolume: Array<{
    date: string
    orders: number
  }>
}

export type SetupResult = {
  restaurantName?: string
  ownerEmail?: string
  driverName?: string
  driverEmail?: string
  setupCode: string
}
