export type CreateRestaurantPayload = {
  ownerName: string
  ownerEmail: string
  restaurantName: string
  description: string
  phone: string
  email: string
  imageUrl: string
  categoryName: string
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
