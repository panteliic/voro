import type {
  CategoryForm,
  DashboardResponse,
  OrderStatus,
  Product,
  ProductCategory,
  ProductForm,
} from '../types/restaurant'
import { request } from './apiClient'

export function getRestaurantDashboard(token: string) {
  return request<DashboardResponse>('/restaurant/me', token)
}

export function updateOrderStatus(token: string, orderId: number, status: OrderStatus) {
  return request<{ order: { id: number; status: OrderStatus } }>(
    `/restaurant/orders/${orderId}/status`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )
}

export function createCategory(token: string, payload: CategoryForm) {
  return request<{ category: ProductCategory; categories: ProductCategory[] }>(
    '/restaurant/categories',
    token,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function saveProduct(
  token: string,
  payload: ProductForm,
  editingProductId: number | null,
) {
  const body = {
    ...payload,
    categoryId: payload.categoryId ? Number(payload.categoryId) : null,
    price: Number(payload.price),
  }
  const path = editingProductId
    ? `/restaurant/products/${editingProductId}`
    : '/restaurant/products'
  const method = editingProductId ? 'PATCH' : 'POST'

  return request<{ product: Product; products: Product[] }>(path, token, {
    method,
    body: JSON.stringify(body),
  })
}
