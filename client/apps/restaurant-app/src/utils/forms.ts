import type { CategoryForm, Product, ProductForm } from '../types/restaurant'

export const emptyCategory: CategoryForm = {
  name: '',
  description: '',
}

export const emptyProduct: ProductForm = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  isAvailable: true,
}

export const emptySetup = {
  email: '',
  setupCode: '',
  password: '',
}

export function productToForm(product: Product): ProductForm {
  return {
    categoryId: product.categoryId ? String(product.categoryId) : '',
    name: product.name,
    description: product.description,
    price: String(product.price),
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
  }
}
