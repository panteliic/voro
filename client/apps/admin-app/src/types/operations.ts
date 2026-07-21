import type { Driver } from './driver'

export type OperationsOrder = {
  id: number
  customerName: string
  restaurantId: number
  restaurantName: string
  restaurantLatitude: number | null
  restaurantLongitude: number | null
  customerLatitude: number | null
  customerLongitude: number | null
  status: string
  deliveryStatus: string
  courierId: number | null
  courierName: string
  courierLatitude: number | null
  courierLongitude: number | null
  dispatchStatus: string
  dispatchError: string
  total: number
  createdAt: string
}

export type SupportIssue = {
  id: number
  orderId: number
  reporterUserId: number
  category: string
  description: string
  status: 'open' | 'in_review' | 'resolved'
  resolutionNote: string
  createdAt: string
  updatedAt: string
}

export type OperationsSnapshot = {
  orders: OperationsOrder[]
  issues: SupportIssue[]
  couriers: Driver[]
}
