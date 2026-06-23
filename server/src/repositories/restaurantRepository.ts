import { pool } from '../database/pool'
import type { PoolClient } from 'pg'
import type {
  CreateRestaurantPayload,
  UpsertProductCategoryPayload,
  UpsertProductPayload,
} from '../types/restaurant'

type RestaurantRow = {
  id: string
  owner_user_id: string
  category_id: string | null
  category_name: string | null
  name: string
  description: string | null
  phone: string | null
  email: string | null
  image_url: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

type ProductCategoryRow = {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

type ProductRow = {
  id: string
  restaurant_id: string
  category_id: string | null
  category_name: string | null
  name: string
  description: string | null
  price: string
  image_url: string | null
  is_available: boolean
  created_at: Date
  updated_at: Date
}

function toRestaurant(row: RestaurantRow) {
  return {
    id: Number(row.id),
    ownerUserId: Number(row.owner_user_id),
    categoryId: row.category_id ? Number(row.category_id) : null,
    categoryName: row.category_name || '',
    name: row.name,
    description: row.description || '',
    phone: row.phone || '',
    email: row.email || '',
    imageUrl: row.image_url || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProductCategory(row: ProductCategoryRow) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    name: row.name,
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProduct(row: ProductRow) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    categoryId: row.category_id ? Number(row.category_id) : null,
    categoryName: row.category_name || '',
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    imageUrl: row.image_url || '',
    isAvailable: row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getOrCreateRestaurantCategory(client: PoolClient, categoryName: string) {
  const name = categoryName.trim() || 'General'
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO restaurant_category (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [name],
  )

  return Number(result.rows[0].id)
}

export async function createRestaurantWithOwner(payload: CreateRestaurantPayload & {
  ownerPasswordHash: string
}) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const categoryId = await getOrCreateRestaurantCategory(client, payload.categoryName)
    const userResult = await client.query<{ id: string }>(
      `
        INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at)
        VALUES ($1, $2, $3, 2, TRUE, NOW())
        RETURNING id
      `,
      [payload.ownerName, payload.ownerEmail, payload.ownerPasswordHash],
    )
    const ownerUserId = Number(userResult.rows[0].id)
    const restaurantResult = await client.query<RestaurantRow>(
      `
        INSERT INTO restaurant (
          owner_user_id,
          category_id,
          name,
          description,
          phone,
          email,
          image_url,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING *,
          (SELECT name FROM restaurant_category WHERE id = restaurant.category_id) AS category_name
      `,
      [
        ownerUserId,
        categoryId,
        payload.restaurantName,
        payload.description || null,
        payload.phone || null,
        payload.email || payload.ownerEmail,
        payload.imageUrl || null,
      ],
    )

    await client.query('COMMIT')

    return {
      restaurant: toRestaurant(restaurantResult.rows[0]),
      owner: {
        id: ownerUserId,
        name: payload.ownerName,
        email: payload.ownerEmail,
      },
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listRestaurants() {
  const result = await pool.query<RestaurantRow>(
    `
      SELECT r.*, rc.name AS category_name
      FROM restaurant r
      LEFT JOIN restaurant_category rc ON rc.id = r.category_id
      ORDER BY r.created_at DESC
    `,
  )

  return result.rows.map(toRestaurant)
}

export async function findRestaurantByOwner(userId: number) {
  const result = await pool.query<RestaurantRow>(
    `
      SELECT r.*, rc.name AS category_name
      FROM restaurant r
      LEFT JOIN restaurant_category rc ON rc.id = r.category_id
      WHERE r.owner_user_id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] ? toRestaurant(result.rows[0]) : null
}

export async function listProductCategories(restaurantId: number) {
  const result = await pool.query<ProductCategoryRow>(
    `
      SELECT *
      FROM product_category
      WHERE restaurant_id = $1
      ORDER BY name ASC
    `,
    [restaurantId],
  )

  return result.rows.map(toProductCategory)
}

export async function createProductCategory(
  restaurantId: number,
  payload: UpsertProductCategoryPayload,
) {
  const result = await pool.query<ProductCategoryRow>(
    `
      INSERT INTO product_category (restaurant_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [restaurantId, payload.name, payload.description || null],
  )

  return toProductCategory(result.rows[0])
}

export async function listProducts(restaurantId: number) {
  const result = await pool.query<ProductRow>(
    `
      SELECT p.*, pc.name AS category_name
      FROM product p
      LEFT JOIN product_category pc ON pc.id = p.category_id
      WHERE p.restaurant_id = $1
      ORDER BY p.created_at DESC
    `,
    [restaurantId],
  )

  return result.rows.map(toProduct)
}

export async function createProduct(restaurantId: number, payload: UpsertProductPayload) {
  const result = await pool.query<ProductRow>(
    `
      INSERT INTO product (
        restaurant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_available
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *,
        (SELECT name FROM product_category WHERE id = product.category_id) AS category_name
    `,
    [
      restaurantId,
      payload.categoryId,
      payload.name,
      payload.description || null,
      payload.price,
      payload.imageUrl || null,
      payload.isAvailable,
    ],
  )

  return toProduct(result.rows[0])
}

export async function updateProduct(
  restaurantId: number,
  productId: number,
  payload: UpsertProductPayload,
) {
  const result = await pool.query<ProductRow>(
    `
      UPDATE product
      SET
        category_id = $3,
        name = $4,
        description = $5,
        price = $6,
        image_url = $7,
        is_available = $8,
        updated_at = NOW()
      WHERE restaurant_id = $1 AND id = $2
      RETURNING *,
        (SELECT name FROM product_category WHERE id = product.category_id) AS category_name
    `,
    [
      restaurantId,
      productId,
      payload.categoryId,
      payload.name,
      payload.description || null,
      payload.price,
      payload.imageUrl || null,
      payload.isAvailable,
    ],
  )

  return result.rows[0] ? toProduct(result.rows[0]) : null
}
