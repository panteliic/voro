export type AdminRole = 'customer' | 'restaurant' | 'courier' | 'admin'

export type AdminUser = {
  id: number
  name: string
  email: string
  role: AdminRole
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  restaurantName: string
  courierPhone: string
  vehicleType: string
  isAvailable: boolean | null
}
