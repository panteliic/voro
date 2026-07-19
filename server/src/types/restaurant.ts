export type CreateRestaurantPayload = {
  contactName: string
  contactEmail: string
  restaurantName: string
  description: string
  phone: string
  email: string
  imageUrl: string
  address: string
  categoryName: string
  categoryIds: number[]
}

export type RestaurantCategory = {
  id: number
  name: string
  slug: string
  icon: string
  sortOrder: number
}

export type UpsertProductCategoryPayload = {
  name: string
  description: string
}

export type UpsertProductPayload = {
  categoryId: number | null
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
}
