export type Driver = {
  id: number
  userId: number
  name: string
  email: string
  phone: string
  vehicleType: string
  isAvailable: boolean
  isOnline: boolean
  currentLatitude: number | null
  currentLongitude: number | null
  lastLocationAt: string | null
}

export type DeliveryStatus = 'assigned' | 'arriving_to_restaurant' | 'picked_up' | 'on_the_way'

export type Delivery = {
  id: number
  orderId: number
  status: DeliveryStatus
  orderStatus: string
  restaurantName: string
  restaurantAddress: string
  restaurantLatitude: number
  restaurantLongitude: number
  customerName: string
  customerAddress: string
  customerLatitude: number
  customerLongitude: number
  total: number
  paymentMethod: 'card' | 'cash'
  cashTendered: number | null
  changeDue: number
  pickupCode: string
  createdAt: string
  pickedUpAt: string | null
}

export type DeliveryOffer = {
  id: number
  orderId: number
  restaurantName: string
  restaurantAddress: string
  restaurantLatitude: number
  restaurantLongitude: number
  customerName: string
  customerAddress: string
  customerLatitude: number
  customerLongitude: number
  total: number
  paymentMethod: 'card' | 'cash'
  cashTendered: number | null
  changeDue: number
  expiresAt: string
  createdAt: string
}

export type DriverOfferRouteEstimate = {
  offerId: number
  currentLocation: { latitude: number; longitude: number }
  toRestaurant: {
    distanceMeters: number
    etaMinutes: number
    etaRange: { min: number; max: number }
    algorithm: 'a-star'
  }
  toCustomer: {
    distanceMeters: number
    etaMinutes: number
    etaRange: { min: number; max: number }
    algorithm: 'a-star'
  }
  total: {
    distanceMeters: number
    etaMinutes: number
    etaRange: { min: number; max: number }
  }
}

export type DriverHistoryItem = {
  deliveryId: number
  orderId: number
  restaurantName: string
  customerAddress: string
  total: number
  pickedUpAt: string | null
  deliveredAt: string
}

export type DriverAnalyticsPeriod = {
  deliveries: number
  earnings: number
  workMinutes: number
}

export type DriverAnalyticsDay = DriverAnalyticsPeriod & {
  date: string
}

export type DriverAnalytics = {
  today: DriverAnalyticsPeriod
  week: DriverAnalyticsPeriod
  month: DriverAnalyticsPeriod
  days: DriverAnalyticsDay[]
}

export type DriverRoute = {
  deliveryId: number
  currentLocation: { latitude: number; longitude: number }
  destination: {
    type: 'restaurant' | 'customer'
    name: string
    address: string
    latitude: number
    longitude: number
  }
  route: {
    coordinates: Array<[number, number]>
    distanceMeters: number
    etaMinutes: number
    etaRange: { min: number; max: number }
    algorithm: 'a-star'
  }
}

export type DriverOrderMessage = {
  id: number
  orderId: number
  senderUserId: number
  senderRole: 'customer' | 'courier'
  senderName: string
  body: string
  readAt: string | null
  createdAt: string
}

export type DriverNotification = {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export type DashboardResponse = {
  driver: Driver
  deliveries: Delivery[]
  activeDelivery: Delivery | null
  offers: DeliveryOffer[]
  history: DriverHistoryItem[]
  analytics: DriverAnalytics
}

export type UpdatePresencePayload = {
  isOnline: boolean
  latitude?: number
  longitude?: number
  accuracyMeters?: number
  headingDegrees?: number
  speedMps?: number
  capturedAt?: string
}
