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
  referral: {
    code: string
    completedReferrals: number
  }
}

export type RestaurantCategory = {
  id: number
  name: string
  slug: string
  icon: string
  sortOrder: number
}

export type DiscoverableRestaurant = {
  id: number
  name: string
  description: string
  phone: string
  email: string
  imageUrl: string
  categoryName: string
  categories: RestaurantCategory[]
  isActive: boolean
  isFavorite: boolean
  isOpen: boolean
  deliveryRadiusKm?: number
  rating?: number
  reviewCount?: number
}

export type RestaurantDiscovery = {
  categories: RestaurantCategory[]
  restaurants: DiscoverableRestaurant[]
}

export type RestaurantMenuCategory = {
  id: number
  name: string
  description: string
}

export type RestaurantMenuProduct = {
  id: number
  categoryId: number | null
  categoryName: string
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
}

export type RestaurantMenu = {
  restaurant: DiscoverableRestaurant
  categories: RestaurantMenuCategory[]
  products: RestaurantMenuProduct[]
}

export type CustomerOrderItemPayload = {
  productId: number
  quantity: number
}

export type CustomerOrderPaymentMethod = 'card' | 'cash'

export type CustomerOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

export type CreatedCustomerOrder = {
  id: number
  status: CustomerOrderStatus
  subtotal: number
  deliveryFee: number
  discountAmount: number
  tipAmount: number
  promotionCode: string | null
  referralCode: string | null
  total: number
  paymentMethod: CustomerOrderPaymentMethod
  cashTendered: number | null
  changeDue: number
  createdAt: string
  items: Array<{
    productId: number
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export type CustomerOrder = {
  id: number
  restaurantId: number
  restaurantName: string
  restaurantImageUrl: string
  restaurantPreparationMinutes?: number
  restaurantBusyUntil?: string | null
  status: CustomerOrderStatus
  driverName: string
  deliveryStatus: string
  subtotal: number
  deliveryFee: number
  discountAmount: number
  tipAmount: number
  total: number
  note: string
  address: string
  createdAt: string
  updatedAt: string
  estimatedDeliveryMinutes: number | null
  estimatedDeliveryRange: { min: number; max: number } | null
  items: Array<{
    productId: number
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export type CustomerNotification = {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export type CustomerSession = {
  id: number
  deviceLabel: string
  ipAddress: string
  createdAt: string
  lastActiveAt: string
  expiresAt: string
  isCurrent: boolean
}

export type CustomerOrderMessage = {
  id: number
  orderId: number
  senderUserId: number
  senderRole: 'customer' | 'courier'
  senderName: string
  body: string
  readAt: string | null
  createdAt: string
}

export type CustomerOrdersResponse = {
  orders: CustomerOrder[]
}

export type CustomerOrderRoute = {
  orderId: number
  restaurant: {
    name: string
    latitude: number
    longitude: number
  }
  delivery: {
    address: string
    latitude: number
    longitude: number
  }
  courier: {
    name: string
    latitude: number | null
    longitude: number | null
    accuracyMeters: number | null
    headingDegrees: number | null
    recordedAt: string | null
    isStale: boolean
  } | null
  deliveryStatus: string | null
  route: {
    coordinates: Array<[number, number]>
    distanceMeters: number
    etaMinutes: number
    etaRange: { min: number; max: number }
    algorithm: 'a-star'
  } | null
}

export type CustomerOrderTracking = Pick<CustomerOrderRoute, 'orderId' | 'courier' | 'deliveryStatus'>

export type CustomerAddressPayload = Omit<CustomerAddress, 'id' | 'userId' | 'isDefault'>
export type CustomerPaymentMethodPayload = Omit<
  CustomerPaymentMethod,
  'id' | 'userId' | 'isDefault'
> & {
  cardNumber?: string
}
