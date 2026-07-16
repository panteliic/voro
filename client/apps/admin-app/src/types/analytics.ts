import type { Driver } from './driver'
import type { Order } from './order'
import type { Restaurant } from './restaurant'

export type AnalyticsSummary = {
  totalAmount: number
  completedCount: number
  averageAmount: number
  activeCount: number
  thisWeekAmount: number
  lastWeekAmount: number
  thisMonthAmount: number
  lastMonthAmount: number
}

export type DailyAnalytics = {
  date: string
  amount: number
  count: number
}

export type RestaurantAnalytics = {
  restaurant: Restaurant
  summary: AnalyticsSummary
  dailyRevenue: DailyAnalytics[]
  recentOrders: Order[]
}

export type DriverDeliveryAnalytics = {
  id: number
  orderId: number
  status: string
  restaurantName: string
  customerName: string
  total: number
  earning: number
  createdAt: string
  deliveredAt: string | null
}

export type DriverAnalytics = {
  courier: Driver
  summary: AnalyticsSummary
  dailyEarnings: DailyAnalytics[]
  recentDeliveries: DriverDeliveryAnalytics[]
}
