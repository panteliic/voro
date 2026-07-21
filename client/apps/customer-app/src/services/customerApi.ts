import type {
  CustomerAddressPayload,
  CreatedCustomerOrder,
  CustomerOrdersResponse,
  CustomerOrderRoute,
  CustomerOrderTracking,
  CustomerOrderItemPayload,
  CustomerOrderPaymentMethod,
  CustomerNotification,
  CustomerOrderMessage,
  CustomerPaymentMethodPayload,
  CustomerPreferences,
  CustomerProfile,
  CustomerUserProfile,
  RestaurantDiscovery,
  RestaurantMenu,
} from '../types/customer'
import type { LocationSuggestion } from '../types/location'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const ACCESS_TOKEN_KEY = 'voro_access_token'
const REFRESH_TOKEN_KEY = 'voro_refresh_token'
export const CUSTOMER_SESSION_REFRESHED_EVENT = 'voro:customer-session-refreshed'
export const CUSTOMER_SESSION_EXPIRED_EVENT = 'voro:customer-session-expired'

export type CustomerSessionTokens = {
  accessToken: string
  refreshToken: string
}

let refreshPromise: Promise<string> | null = null

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.dispatchEvent(new Event(CUSTOMER_SESSION_EXPIRED_EVENT))
}

function publishSessionRefresh(tokens: CustomerSessionTokens) {
  window.dispatchEvent(
    new CustomEvent<CustomerSessionTokens>(CUSTOMER_SESSION_REFRESHED_EVENT, { detail: tokens }),
  )
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || ''

  if (!refreshToken) {
    clearStoredSession()
    throw new Error('Session expired. Please sign in again.')
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Partial<CustomerSessionTokens> & { message?: string }

        if (!response.ok || !data.accessToken || !data.refreshToken) {
          clearStoredSession()
          throw new Error(data.message || 'Session expired. Please sign in again.')
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
        publishSessionRefresh({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function request<TResponse>(path: string, options: RequestInit = {}) {
  const send = (token: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

  let response = await send(localStorage.getItem(ACCESS_TOKEN_KEY) || '')

  if (response.status === 401) {
    response = await send(await refreshAccessToken())
  }

  if (response.status === 401) {
    clearStoredSession()
  }

  const data = (await response.json()) as TResponse & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

function jsonRequest<TResponse>(path: string, method: string, body: unknown) {
  return request<TResponse>(path, {
    method,
    body: JSON.stringify(body),
  })
}

export const customerApi = {
  searchAddressSuggestions(query: string, signal?: AbortSignal) {
    return request<{ suggestions: LocationSuggestion[] }>(
      `/customer/address-suggestions?q=${encodeURIComponent(query)}`,
      { signal },
    ).then((result) => result.suggestions)
  },

  getProfile() {
    return request<CustomerProfile>('/customer/profile')
  },

  getRestaurantDiscovery(categorySlug = '') {
    const query = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ''
    return request<RestaurantDiscovery>(`/customer/restaurants${query}`)
  },

  getRestaurantMenu(restaurantId: number) {
    return request<RestaurantMenu>(`/customer/restaurants/${restaurantId}`)
  },

  createOrder(payload: {
    restaurantId: number
    addressId: number | null
    note: string
    items: CustomerOrderItemPayload[]
    paymentMethod: CustomerOrderPaymentMethod
    cashTendered: number | null
  }) {
    return jsonRequest<{ order: CreatedCustomerOrder }>('/customer/orders', 'POST', payload)
  },

  getOrders() {
    return request<CustomerOrdersResponse>('/customer/orders')
  },

  getOrderRoute(orderId: number) {
    return request<CustomerOrderRoute>(`/customer/orders/${orderId}/route`)
  },

  getOrderTracking(orderId: number) {
    return request<CustomerOrderTracking>(`/customer/orders/${orderId}/tracking`, { cache: 'no-store' })
  },

  getFavorites() {
    return request<{ restaurantIds: number[] }>('/customer/favorites')
  },

  setFavorite(restaurantId: number, isFavorite: boolean) {
    return request<{ favorite: { restaurantId: number; isFavorite: boolean } }>(
      `/customer/favorites/${restaurantId}`,
      {
        method: isFavorite ? 'PUT' : 'DELETE',
        ...(isFavorite ? { body: JSON.stringify({ isFavorite: true }) } : {}),
      },
    )
  },

  cancelOrder(orderId: number, reason = '') {
    return jsonRequest<{ cancelled: true }>(`/customer/orders/${orderId}/cancel`, 'POST', { reason })
  },

  createOrderIssue(orderId: number, payload: { category: string; description: string }) {
    return jsonRequest(`/customer/orders/${orderId}/issues`, 'POST', payload)
  },

  createOrderReview(orderId: number, payload: { rating: number; comment: string }) {
    return jsonRequest(`/customer/orders/${orderId}/review`, 'POST', payload)
  },

  reorderOrder(orderId: number, payload: { addressId?: number | null; paymentMethod?: CustomerOrderPaymentMethod; cashTendered?: number | null } = {}) {
    return jsonRequest<{ order: CreatedCustomerOrder }>(`/customer/orders/${orderId}/reorder`, 'POST', payload)
  },

  getOrderMessages(orderId: number) {
    return request<{ messages: CustomerOrderMessage[] }>(`/customer/orders/${orderId}/messages`, { cache: 'no-store' })
  },

  sendOrderMessage(orderId: number, body: string) {
    return jsonRequest<{ message: CustomerOrderMessage }>(`/customer/orders/${orderId}/messages`, 'POST', { body })
  },

  getNotifications() {
    return request<{ notifications: CustomerNotification[]; unreadCount: number }>('/customer/notifications', { cache: 'no-store' })
  },

  readNotification(notificationId: number) {
    return request<{ read: true }>(`/customer/notifications/${notificationId}/read`, { method: 'PATCH', body: '{}' })
  },

  updateProfile(payload: Pick<CustomerUserProfile, 'name' | 'phone'>) {
    return jsonRequest<Pick<CustomerProfile, 'user'>>('/customer/profile', 'PATCH', payload)
  },

  updatePreferences(payload: CustomerPreferences) {
    return jsonRequest<Pick<CustomerProfile, 'preferences'>>(
      '/customer/preferences',
      'PATCH',
      payload,
    )
  },

  createAddress(payload: CustomerAddressPayload) {
    return jsonRequest<Pick<CustomerProfile, 'addresses'>>('/customer/addresses', 'POST', payload)
  },

  updateAddress(addressId: number, payload: CustomerAddressPayload) {
    return jsonRequest<Pick<CustomerProfile, 'addresses'>>(
      `/customer/addresses/${addressId}`,
      'PATCH',
      payload,
    )
  },

  setDefaultAddress(addressId: number) {
    return jsonRequest<Pick<CustomerProfile, 'addresses'>>(
      `/customer/addresses/${addressId}/default`,
      'PATCH',
      {},
    )
  },

  deleteAddress(addressId: number) {
    return request<Pick<CustomerProfile, 'addresses'>>(`/customer/addresses/${addressId}`, {
      method: 'DELETE',
    })
  },

  createPaymentMethod(payload: CustomerPaymentMethodPayload) {
    return jsonRequest<Pick<CustomerProfile, 'paymentMethods'>>(
      '/customer/payment-methods',
      'POST',
      payload,
    )
  },

  updatePaymentMethod(paymentMethodId: number, payload: CustomerPaymentMethodPayload) {
    return jsonRequest<Pick<CustomerProfile, 'paymentMethods'>>(
      `/customer/payment-methods/${paymentMethodId}`,
      'PATCH',
      payload,
    )
  },

  setDefaultPaymentMethod(paymentMethodId: number) {
    return jsonRequest<Pick<CustomerProfile, 'paymentMethods'>>(
      `/customer/payment-methods/${paymentMethodId}/default`,
      'PATCH',
      {},
    )
  },

  deletePaymentMethod(paymentMethodId: number) {
    return request<Pick<CustomerProfile, 'paymentMethods'>>(
      `/customer/payment-methods/${paymentMethodId}`,
      {
        method: 'DELETE',
      },
    )
  },
}
