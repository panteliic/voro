export type CustomerUserProfile = {
  id: number
  name: string
  email: string
  phone: string
}

export type CustomerPreferences = {
  userId: number
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

export type CustomerAddress = {
  id: number
  userId: number
  label: string
  street: string
  city: string
  postalCode: string
  country: string
  apartment: string
  deliveryInstructions: string
  latitude: number | null
  longitude: number | null
  isDefault: boolean
}

export type CustomerPaymentMethod = {
  id: number
  userId: number
  label: string
  brand: string
  last4: string
  expMonth: number | null
  expYear: number | null
  isDefault: boolean
}

export type CustomerProfile = {
  user: CustomerUserProfile
  preferences: CustomerPreferences
  addresses: CustomerAddress[]
  paymentMethods: CustomerPaymentMethod[]
}

export type CustomerAddressPayload = Omit<CustomerAddress, 'id' | 'userId' | 'isDefault'>
export type CustomerPaymentMethodPayload = Omit<
  CustomerPaymentMethod,
  'id' | 'userId' | 'isDefault'
> & {
  cardNumber?: string
}
