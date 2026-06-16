import type {
  CustomerAddressPayload,
  CustomerPaymentMethodPayload,
  CustomerPreferences,
  CustomerProfile,
  CustomerUserProfile,
} from '../types/customer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request<TResponse>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('voro_access_token') || ''
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
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
  getProfile() {
    return request<CustomerProfile>('/customer/profile')
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
