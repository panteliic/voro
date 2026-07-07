import type { Order } from '../types/order'
import { apiRequest } from './apiClient'

export function listOrders(status = '') {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''

  return apiRequest<{ orders: Order[] }>(`/admin/orders${params}`)
}

export function getOrder(orderId: number) {
  return apiRequest<{ order: Order }>(`/admin/orders/${orderId}`)
}
