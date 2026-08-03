export type Restaurant = {
  id: number
  name: string
  description: string
  categoryName: string
  phone: string
  email: string
  imageUrl: string
  isActive: boolean
  deliveryRadiusKm: number
  openingHours: Record<string, { enabled: boolean; open: string; close: string }>
  isAcceptingOrders: boolean
}

export type ProductCategory = {
  id: number
  name: string
  description: string
}

export type Product = {
  id: number
  categoryId: number | null
  categoryName: string
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
}

export type DashboardResponse = {
  restaurant: Restaurant
  categories: ProductCategory[]
  products: Product[]
  orders: RestaurantOrder[]
  notifications: RestaurantNotification[]
  unreadNotifications: number
}

export type RestaurantNotification = {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export type RestaurantOperations = Pick<Restaurant, 'deliveryRadiusKm' | 'openingHours' | 'isAcceptingOrders'>

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

export type RestaurantOrder = {
  id: number
  customerName: string
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  total: number
  note: string
  items: Array<{ name: string; quantity: number }>
  createdAt: string
  updatedAt: string
  completedAt: string | null
  address: string
  driverName: string
  pickupCode: string
}

export type CategoryForm = {
  name: string
  description: string
}

export type ProductForm = {
  categoryId: string
  name: string
  description: string
  price: string
  imageUrl: string
  isAvailable: boolean
}
