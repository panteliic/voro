export type Restaurant = {
  id: number
  name: string
  description: string
  categoryName: string
  phone: string
  email: string
  imageUrl: string
  isActive: boolean
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
}

export type OrderStatus = 'New' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled'

export type RestaurantOrder = {
  id: string
  customer: string
  status: OrderStatus
  eta: string
  total: string
  items: string[]
  createdAt: string
  completedAt?: string
  pickupCode: string
  driver?: string
  address: string
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
