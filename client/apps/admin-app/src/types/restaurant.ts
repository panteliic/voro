export type Restaurant = {
  id: number
  categoryId: number | null
  categoryName: string
  categories: RestaurantCategory[]
  name: string
  description: string
  phone: string
  email: string
  imageUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type RestaurantCategory = {
  id: number
  name: string
  slug: string
  icon: string
  sortOrder: number
}

export type CreateRestaurantPayload = {
  contactName: string
  contactEmail: string
  restaurantName: string
  categoryName: string
  categoryIds: number[]
  description: string
  phone: string
  email: string
  imageUrl: string
}

export type UpdateRestaurantPayload = {
  name: string
  categoryName: string
  categoryIds: number[]
  description: string
  phone: string
  email: string
  imageUrl: string
  isActive: boolean
}
