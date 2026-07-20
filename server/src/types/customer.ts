export type CustomerProfilePayload = {
  name: string
  phone: string
}

export type CustomerAddressPayload = {
  label: string
  street: string
  city: string
  postalCode: string
  country: string
  apartment: string
  deliveryInstructions: string
  latitude: number | null
  longitude: number | null
}

export type CustomerPaymentMethodPayload = {
  label: string
  brand: string
  last4: string
  cardNumber?: string
  encryptedCardNumber?: string
  expMonth: number | null
  expYear: number | null
}

export type CustomerPreferencesPayload = {
  deliveryHandoff: string
  courierNotes: string
  allowSubstitutions: boolean
  preferredDeliveryWindow: string
  orderStatusNotifications: boolean
  courierMessageNotifications: boolean
  promotionNotifications: boolean
  receiptEmailNotifications: boolean
  twoStepVerification: boolean
  personalizedRecommendations: boolean
  reduceMotion: boolean
}

export type CustomerOrderItemPayload = {
  productId: number
  quantity: number
}

export type CustomerOrderPaymentMethod = 'card' | 'cash'

export type CreateCustomerOrderPayload = {
  restaurantId: number
  addressId: number | null
  note: string
  items: CustomerOrderItemPayload[]
  paymentMethod: CustomerOrderPaymentMethod
  cashTendered: number | null
}
