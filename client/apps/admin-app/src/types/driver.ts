export type Driver = {
  id: number
  userId: number
  name: string
  email: string
  phone: string
  vehicleType: string
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export type CreateDriverPayload = {
  name: string
  email: string
  phone: string
  vehicleType: string
}
