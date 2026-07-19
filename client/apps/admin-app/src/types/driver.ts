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
  createdAt: string
  updatedAt: string
}

export type CreateDriverPayload = {
  name: string
  email: string
  phone: string
  vehicleType: string
}
