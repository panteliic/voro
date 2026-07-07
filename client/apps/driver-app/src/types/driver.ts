export type Driver = {
  id: number
  userId: number
  name: string
  email: string
  phone: string
  vehicleType: string
  isAvailable: boolean
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
