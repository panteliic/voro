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
  createdAt: Date
  updatedAt: Date
}

export type DriverDelivery = {
  id: number
  orderId: number
  status: string
  restaurantName: string
  customerName: string
  total: number
  createdAt: Date
}
