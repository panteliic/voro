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
  total: number
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
  status: CustomerOrderStatus
  subtotal: number
  deliveryFee: number
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

export type CustomerOrdersResponse = {
  orders: CustomerOrder[]
}

export type CustomerAddressPayload = Omit<CustomerAddress, 'id' | 'userId' | 'isDefault'>
export type CustomerPaymentMethodPayload = Omit<
  CustomerPaymentMethod,
  'id' | 'userId' | 'isDefault'
> & {
  cardNumber?: string
}
