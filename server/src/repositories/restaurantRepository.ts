import { pool } from '../database/pool'
import type { PoolClient } from 'pg'
import type {
  CreateRestaurantPayload,
  RestaurantCategory,
  UpsertProductCategoryPayload,
  UpsertProductPayload,
} from '../types/restaurant'

type RestaurantRow = {
  id: string
  category_id: string | null
  category_name: string | null
  categories: RestaurantCategory[] | null
  name: string
  description: string | null
  phone: string | null
  email: string | null
  image_url: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  is_active: boolean
  delivery_radius_km: string
  opening_hours: Record<string, unknown>
  is_accepting_orders: boolean
  preparation_minutes: number
  busy_until: Date | null
  auto_accept_orders: boolean
  rating: string
  review_count: string
  created_at: Date
  updated_at: Date
}

type RestaurantCategoryRow = {
  id: string
  name: string
  slug: string | null
  icon: string | null
  sort_order: number
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

type RestaurantOrderRow = {
  id: string
  customer_name: string
  status: string
  subtotal: string
  delivery_fee: string
  total: string
  note: string | null
  address: string | null
  driver_name: string | null
  pickup_code: string | null
  created_at: Date
  updated_at: Date
  items: Array<{ name: string; quantity: number }> | null
}

function toRestaurant(row: RestaurantRow) {
  const categories = Array.isArray(row.categories) ? row.categories : []

  return {
    id: Number(row.id),
    categoryId: categories[0]?.id ?? (row.category_id ? Number(row.category_id) : null),
    categoryName: categories.map((category) => category.name).join(', ') || row.category_name || '',
    categories,
    name: row.name,
    description: row.description || '',
    phone: row.phone || '',
    email: row.email || '',
    imageUrl: row.image_url || '',
    address: row.address || '',
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    isActive: row.is_active,
    deliveryRadiusKm: Number(row.delivery_radius_km || 8),
    openingHours: row.opening_hours || {},
    isAcceptingOrders: row.is_accepting_orders,
    preparationMinutes: row.preparation_minutes || 20,
    busyUntil: row.busy_until,
    autoAcceptOrders: row.auto_accept_orders,
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRestaurantCategory(row: RestaurantCategoryRow): RestaurantCategory {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug || '',
    icon: row.icon || '',
    sortOrder: row.sort_order,
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

function toRestaurantOrder(row: RestaurantOrderRow) {
  return {
    id: Number(row.id),
    customerName: row.customer_name,
    status: row.status,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    note: row.note || '',
    address: row.address || '',
    driverName: row.driver_name || '',
    pickupCode: row.pickup_code || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: Array.isArray(row.items) ? row.items : [],
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

async function resolveRestaurantCategoryIds(
  client: PoolClient,
  payload: Pick<CreateRestaurantPayload, 'categoryName' | 'categoryIds'>,
) {
  const requestedCategoryIds = Array.isArray(payload.categoryIds) ? payload.categoryIds : []

  if (requestedCategoryIds.length > 0) {
    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM restaurant_category
        WHERE id = ANY($1::BIGINT[])
        ORDER BY sort_order ASC, name ASC
      `,
      [requestedCategoryIds],
    )

    return result.rows.map((row) => Number(row.id))
  }

  return [await getOrCreateRestaurantCategory(client, payload.categoryName)]
}

async function replaceRestaurantCategories(
  client: PoolClient,
  restaurantId: number,
  categoryIds: number[],
) {
  await client.query('DELETE FROM restaurant_category_map WHERE restaurant_id = $1', [restaurantId])

  if (categoryIds.length === 0) {
    return
  }

  await client.query(
    `
      INSERT INTO restaurant_category_map (restaurant_id, category_id)
      SELECT $1, UNNEST($2::BIGINT[])
      ON CONFLICT DO NOTHING
    `,
    [restaurantId, categoryIds],
  )
}

const restaurantSelect = `
  SELECT r.*, rc.name AS category_name,
    MAX(review_summary.rating) AS rating,
    MAX(review_summary.review_count) AS review_count,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', mapped_category.id,
          'name', mapped_category.name,
          'slug', mapped_category.slug,
          'icon', mapped_category.icon,
          'sortOrder', mapped_category.sort_order
        )
        ORDER BY mapped_category.sort_order ASC, mapped_category.name ASC
      ) FILTER (WHERE mapped_category.id IS NOT NULL),
      '[]'::JSON
    ) AS categories
  FROM restaurant r
  LEFT JOIN restaurant_category rc ON rc.id = r.category_id
  LEFT JOIN restaurant_category_map rcm ON rcm.restaurant_id = r.id
  LEFT JOIN restaurant_category mapped_category ON mapped_category.id = rcm.category_id
  LEFT JOIN LATERAL (
    SELECT AVG(order_review.rating)::TEXT AS rating, COUNT(*)::TEXT AS review_count
    FROM order_review
    WHERE order_review.restaurant_id = r.id
  ) review_summary ON TRUE
`

export async function createRestaurantWithAccount(payload: CreateRestaurantPayload & {
  contactPasswordHash: string
  latitude: number
  longitude: number
}) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const categoryIds = await resolveRestaurantCategoryIds(client, payload)
    const primaryCategoryId = categoryIds[0] || null
    const restaurantResult = await client.query<RestaurantRow>(
      `
        INSERT INTO restaurant (
          category_id,
          name,
          description,
          phone,
          email,
          image_url,
          address,
          latitude,
          longitude,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
        RETURNING *,
          (SELECT name FROM restaurant_category WHERE id = restaurant.category_id) AS category_name
      `,
      [
        primaryCategoryId,
        payload.restaurantName,
        payload.description || null,
        payload.phone || null,
        payload.email || payload.contactEmail,
        payload.imageUrl || null,
        payload.address,
        payload.latitude,
        payload.longitude,
      ],
    )

    await replaceRestaurantCategories(client, Number(restaurantResult.rows[0].id), categoryIds)

    const restaurantId = Number(restaurantResult.rows[0].id)
    const operatorResult = await client.query<{ id: string }>(
      `
        INSERT INTO restaurant_user (restaurant_id, name, email, password, access_role)
        VALUES ($1, $2, $3, $4, 'manager')
        RETURNING id
      `,
      [restaurantId, payload.contactName, payload.contactEmail, payload.contactPasswordHash],
    )

    const hydratedRestaurant = await findRestaurantById(
      restaurantId,
      client,
    )

    await client.query('COMMIT')

    return {
      restaurant: hydratedRestaurant || toRestaurant(restaurantResult.rows[0]),
      operator: {
        id: Number(operatorResult.rows[0].id),
        name: payload.contactName,
        email: payload.contactEmail,
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
      ${restaurantSelect}
      GROUP BY r.id, rc.name
      ORDER BY r.created_at DESC
    `,
  )

  return result.rows.map(toRestaurant)
}

export async function findRestaurantById(restaurantId: number, client: PoolClient | typeof pool = pool) {
  const result = await client.query<RestaurantRow>(
    `
      ${restaurantSelect}
      WHERE r.id = $1
      GROUP BY r.id, rc.name
      LIMIT 1
    `,
    [restaurantId],
  )

  return result.rows[0] ? toRestaurant(result.rows[0]) : null
}

export async function listRestaurantCategories() {
  const result = await pool.query<RestaurantCategoryRow>(
    `
      SELECT id, name, slug, icon, sort_order
      FROM restaurant_category
      ORDER BY sort_order ASC, name ASC
    `,
  )

  return result.rows.map(toRestaurantCategory)
}

export async function listDiscoverableRestaurants(categorySlug = '') {
  const params = categorySlug ? [categorySlug] : []
  const filter = categorySlug
    ? `
      WHERE r.is_active = TRUE
        AND EXISTS (
          SELECT 1
          FROM restaurant_category_map filter_map
          INNER JOIN restaurant_category filter_category ON filter_category.id = filter_map.category_id
          WHERE filter_map.restaurant_id = r.id AND filter_category.slug = $1
        )
    `
    : 'WHERE r.is_active = TRUE'

  const result = await pool.query<RestaurantRow>(
    `
      ${restaurantSelect}
      ${filter}
      GROUP BY r.id, rc.name
      ORDER BY r.created_at DESC
    `,
    params,
  )

  return result.rows.map(toRestaurant)
}

export async function updateRestaurant(
  restaurantId: number,
  payload: {
    name: string
    categoryName: string
    categoryIds: number[]
    description: string
    phone: string
    email: string
    imageUrl: string
    isActive: boolean
  },
) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const categoryIds = await resolveRestaurantCategoryIds(client, {
      categoryName: payload.categoryName,
      categoryIds: payload.categoryIds,
    })
    const primaryCategoryId = categoryIds[0] || null
    const result = await client.query<RestaurantRow>(
      `
        UPDATE restaurant
        SET
          category_id = $2,
          name = $3,
          description = $4,
          phone = $5,
          email = $6,
          image_url = $7,
          is_active = $8,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *,
          (SELECT name FROM restaurant_category WHERE id = restaurant.category_id) AS category_name,
          '[]'::JSON AS categories
      `,
      [
        restaurantId,
        primaryCategoryId,
        payload.name,
        payload.description || null,
        payload.phone || null,
        payload.email || null,
        payload.imageUrl || null,
        payload.isActive,
      ],
    )

    if (!result.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    await replaceRestaurantCategories(client, restaurantId, categoryIds)
    const restaurant = await findRestaurantById(restaurantId, client)

    await client.query('COMMIT')
    return restaurant
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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

export async function listRestaurantOrders(restaurantId: number, limit = 50) {
  const result = await pool.query<RestaurantOrderRow>(
    `
      SELECT
        o.id,
        customer.name AS customer_name,
        status.name AS status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.note,
        NULLIF(CONCAT_WS(', ', address.label, address.street, address.city), '') AS address,
        driver.name AS driver_name,
        delivery.pickup_code,
        o.created_at,
        o.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('name', order_item.product_name, 'quantity', order_item.quantity)
            ORDER BY order_item.id ASC
          ) FILTER (WHERE order_item.id IS NOT NULL),
          '[]'::JSON
        ) AS items
      FROM "order" o
      INNER JOIN "user" customer ON customer.id = o.user_id
      INNER JOIN order_status status ON status.id = o.status_id
      LEFT JOIN address ON address.id = o.address_id
      LEFT JOIN delivery ON delivery.order_id = o.id
      LEFT JOIN courier ON courier.id = delivery.courier_id
      LEFT JOIN "user" driver ON driver.id = courier.user_id
      LEFT JOIN order_item ON order_item.order_id = o.id
      WHERE o.restaurant_id = $1
      GROUP BY o.id, customer.name, status.name, address.label, address.street, address.city, driver.name, delivery.pickup_code
      ORDER BY o.created_at DESC
      LIMIT $2
    `,
    [restaurantId, Math.max(1, Math.min(limit, 100))],
  )

  return result.rows.map(toRestaurantOrder)
}

export async function getRestaurantOrderStatus(restaurantId: number, orderId: number) {
  const result = await pool.query<{ status: string }>(
    `
      SELECT status.name AS status
      FROM "order" o
      INNER JOIN order_status status ON status.id = o.status_id
      WHERE o.restaurant_id = $1 AND o.id = $2
    `,
    [restaurantId, orderId],
  )

  return result.rows[0]?.status || null
}

export async function updateRestaurantOrderStatus(
  restaurantId: number,
  orderId: number,
  status: string,
) {
  const result = await pool.query<{ id: string; status: string }>(
    `
      UPDATE "order" o
      SET status_id = next_status.id, updated_at = NOW()
      FROM order_status next_status
      WHERE o.restaurant_id = $1
        AND o.id = $2
        AND next_status.name = $3
      RETURNING o.id, next_status.name AS status
    `,
    [restaurantId, orderId, status],
  )

  const order = result.rows[0]
  return order ? { id: Number(order.id), status: order.status } : null
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
