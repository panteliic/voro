export type Order = {
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
  createdAt: string
  updatedAt: string
}
