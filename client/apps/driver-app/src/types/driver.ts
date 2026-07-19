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

export type Delivery = {
  id: number
  orderId: number
  status: string
  restaurantName: string
  customerName: string
  total: number
  createdAt: string
}

export type DashboardResponse = {
  driver: Driver
  deliveries: Delivery[]
}

export type UpdatePresencePayload = {
  isOnline: boolean
  latitude?: number
  longitude?: number
}
