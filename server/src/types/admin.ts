export type AdminRole = 'customer' | 'restaurant' | 'courier' | 'admin'

export type AdminPublicUser = {
  id: number
  name: string
  email: string
  role: AdminRole
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  restaurantName: string
  courierPhone: string
  vehicleType: string
  isAvailable: boolean | null
}

export type AdminCourier = {
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

export type AdminOrder = {
  id: number
  userId: number
  customerName: string
  customerEmail: string
  restaurantId: number
  restaurantName: string
  courierId: number | null
  courierName: string
  status: string
  deliveryStatus: string
  subtotal: number
  deliveryFee: number
  total: number
  note: string
  createdAt: Date
  updatedAt: Date
}

export type AdminStats = {
  users: number
  restaurants: number
  drivers: number
  orders: number
  activeOrders: number
  activeRestaurants: number
  availableDrivers: number
}

export type RegisterAdminPayload = {
  name: string
  email: string
  password: string
}

export type CreateCourierPayload = {
  name: string
  email: string
  phone: string
  vehicleType: string
}

export type AdminRestaurantUpdatePayload = {
  name: string
  categoryName: string
  categoryIds: number[]
  description: string
  phone: string
  email: string
  imageUrl: string
  isActive: boolean
}
