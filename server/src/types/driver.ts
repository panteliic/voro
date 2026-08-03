export type DriverProfile = {
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
  lastLocationAt: Date | null
  lastLocationAddress: string
  lastLocationAddressLatitude: number | null
  lastLocationAddressLongitude: number | null
  lastLocationAddressAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type DriverDelivery = {
  id: number
  orderId: number
  status: 'assigned' | 'arriving_to_restaurant' | 'picked_up' | 'on_the_way'
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
  createdAt: Date
  pickedUpAt: Date | null
}

export type DriverOffer = {
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
  expiresAt: Date
  createdAt: Date
}

export type DriverHistoryItem = {
  deliveryId: number
  orderId: number
  restaurantName: string
  customerAddress: string
  total: number
  pickedUpAt: Date | null
  deliveredAt: Date
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
