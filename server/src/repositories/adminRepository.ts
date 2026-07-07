import type { PoolClient } from 'pg'
import { pool } from '../database/pool'
import type {
  AdminCourier,
  AdminOrder,
  AdminPublicUser,
  AdminRestaurantUpdatePayload,
  AdminStats,
  AdminRole,
  CreateCourierPayload,
} from '../types/admin'

type AdminUserRow = {
  id: string
  name: string
  email: string
  role_name: AdminRole
  is_active: boolean
  email_verified: boolean
  created_at: Date
  updated_at: Date
  restaurant_name: string | null
  courier_phone: string | null
  vehicle_type: string | null
  is_available: boolean | null
}

type CourierRow = {
  id: string
  user_id: string
  name: string
  email: string
  phone: string | null
  vehicle_type: string | null
  is_available: boolean
  created_at: Date
  updated_at: Date
}

type OrderRow = {
  id: string
  user_id: string
  customer_name: string
  customer_email: string
  restaurant_id: string
  restaurant_name: string
  courier_id: string | null
  courier_name: string | null
  status: string
  delivery_status: string | null
  subtotal: string
  delivery_fee: string
  total: string
  note: string | null
  created_at: Date
  updated_at: Date
}

type StatsRow = {
  users: string
  restaurants: string
  drivers: string
  orders: string
  active_orders: string
  active_restaurants: string
  available_drivers: string
}

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

function toAdminUser(row: AdminUserRow): AdminPublicUser {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role_name,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    restaurantName: row.restaurant_name || '',
    courierPhone: row.courier_phone || '',
    vehicleType: row.vehicle_type || '',
    isAvailable: row.is_available,
  }
}

function toCourier(row: CourierRow): AdminCourier {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    vehicleType: row.vehicle_type || '',
    isAvailable: row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toOrder(row: OrderRow): AdminOrder {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    restaurantId: Number(row.restaurant_id),
    restaurantName: row.restaurant_name,
    courierId: row.courier_id ? Number(row.courier_id) : null,
    courierName: row.courier_name || '',
    status: row.status,
    deliveryStatus: row.delivery_status || '',
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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

export async function getStats(): Promise<AdminStats> {
  const result = await pool.query<StatsRow>(
    `
      SELECT
        (SELECT COUNT(*) FROM "user") AS users,
        (SELECT COUNT(*) FROM restaurant) AS restaurants,
        (SELECT COUNT(*) FROM courier) AS drivers,
        (SELECT COUNT(*) FROM "order") AS orders,
        (
          SELECT COUNT(*)
          FROM "order" o
          INNER JOIN order_status os ON os.id = o.status_id
          WHERE os.name NOT IN ('delivered', 'cancelled')
        ) AS active_orders,
        (SELECT COUNT(*) FROM restaurant WHERE is_active = TRUE) AS active_restaurants,
        (SELECT COUNT(*) FROM courier WHERE is_available = TRUE) AS available_drivers
    `,
  )
  const row = result.rows[0]

  return {
    users: Number(row.users),
    restaurants: Number(row.restaurants),
    drivers: Number(row.drivers),
    orders: Number(row.orders),
    activeOrders: Number(row.active_orders),
    activeRestaurants: Number(row.active_restaurants),
    availableDrivers: Number(row.available_drivers),
  }
}

export async function listUsers() {
  const result = await pool.query<AdminUserRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        r.name AS role_name,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.updated_at,
        restaurant.name AS restaurant_name,
        courier.phone AS courier_phone,
        courier.vehicle_type,
        courier.is_available
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
      LEFT JOIN restaurant ON restaurant.owner_user_id = u.id
      LEFT JOIN courier ON courier.user_id = u.id
      ORDER BY u.created_at DESC
    `,
  )

  return result.rows.map(toAdminUser)
}

export async function findUserById(userId: number) {
  const result = await pool.query<AdminUserRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        r.name AS role_name,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.updated_at,
        restaurant.name AS restaurant_name,
        courier.phone AS courier_phone,
        courier.vehicle_type,
        courier.is_available
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
      LEFT JOIN restaurant ON restaurant.owner_user_id = u.id
      LEFT JOIN courier ON courier.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] ? toAdminUser(result.rows[0]) : null
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const result = await pool.query<AdminUserRow>(
    `
      UPDATE "user"
      SET is_active = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        email,
        (SELECT name FROM role WHERE id = "user".role_id) AS role_name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        NULL::TEXT AS restaurant_name,
        NULL::TEXT AS courier_phone,
        NULL::TEXT AS vehicle_type,
        NULL::BOOLEAN AS is_available
    `,
    [userId, isActive],
  )

  return result.rows[0] ? findUserById(Number(result.rows[0].id)) : null
}

export async function listCouriers() {
  const result = await pool.query<CourierRow>(
    `
      SELECT
        courier.*,
        u.name,
        u.email
      FROM courier
      INNER JOIN "user" u ON u.id = courier.user_id
      ORDER BY courier.created_at DESC
    `,
  )

  return result.rows.map(toCourier)
}

export async function findCourierById(courierId: number) {
  const result = await pool.query<CourierRow>(
    `
      SELECT
        courier.*,
        u.name,
        u.email
      FROM courier
      INNER JOIN "user" u ON u.id = courier.user_id
      WHERE courier.id = $1
      LIMIT 1
    `,
    [courierId],
  )

  return result.rows[0] ? toCourier(result.rows[0]) : null
}

export async function createCourier(payload: CreateCourierPayload & { passwordHash: string }) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const userResult = await client.query<{ id: string }>(
      `
        INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at)
        VALUES ($1, $2, $3, 3, TRUE, NOW())
        RETURNING id
      `,
      [payload.name, payload.email, payload.passwordHash],
    )
    const userId = Number(userResult.rows[0].id)
    const courier = await createCourierForUser(client, userId, payload)

    await client.query('COMMIT')
    return courier
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function savePasswordSetupCode(
  userId: number,
  codeHash: string,
  expiresAt: Date,
) {
  await pool.query(
    `
      INSERT INTO password_reset_code (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, codeHash, expiresAt],
  )
}

export async function updateCourierStatus(courierId: number, isAvailable: boolean) {
  const result = await pool.query<CourierRow>(
    `
      UPDATE courier
      SET is_available = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *,
        (SELECT name FROM "user" WHERE id = courier.user_id) AS name,
        (SELECT email FROM "user" WHERE id = courier.user_id) AS email
    `,
    [courierId, isAvailable],
  )

  return result.rows[0] ? toCourier(result.rows[0]) : null
}

export async function listOrders(status?: string) {
  const params: string[] = []
  const statusFilter = status ? 'WHERE os.name = $1' : ''

  if (status) {
    params.push(status)
  }

  const result = await pool.query<OrderRow>(
    `
      SELECT
        o.id,
        o.user_id,
        customer.name AS customer_name,
        customer.email AS customer_email,
        o.restaurant_id,
        restaurant.name AS restaurant_name,
        courier.id AS courier_id,
        courier_user.name AS courier_name,
        os.name AS status,
        ds.name AS delivery_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.note,
        o.created_at,
        o.updated_at
      FROM "order" o
      INNER JOIN "user" customer ON customer.id = o.user_id
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      INNER JOIN order_status os ON os.id = o.status_id
      LEFT JOIN delivery ON delivery.order_id = o.id
      LEFT JOIN delivery_status ds ON ds.id = delivery.status_id
      LEFT JOIN courier ON courier.id = delivery.courier_id
      LEFT JOIN "user" courier_user ON courier_user.id = courier.user_id
      ${statusFilter}
      ORDER BY o.created_at DESC
    `,
    params,
  )

  return result.rows.map(toOrder)
}

export async function findOrderById(orderId: number) {
  const result = await pool.query<OrderRow>(
    `
      SELECT
        o.id,
        o.user_id,
        customer.name AS customer_name,
        customer.email AS customer_email,
        o.restaurant_id,
        restaurant.name AS restaurant_name,
        courier.id AS courier_id,
        courier_user.name AS courier_name,
        os.name AS status,
        ds.name AS delivery_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.note,
        o.created_at,
        o.updated_at
      FROM "order" o
      INNER JOIN "user" customer ON customer.id = o.user_id
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      INNER JOIN order_status os ON os.id = o.status_id
      LEFT JOIN delivery ON delivery.order_id = o.id
      LEFT JOIN delivery_status ds ON ds.id = delivery.status_id
      LEFT JOIN courier ON courier.id = delivery.courier_id
      LEFT JOIN "user" courier_user ON courier_user.id = courier.user_id
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  )

  return result.rows[0] ? toOrder(result.rows[0]) : null
}

export async function findRestaurantById(restaurantId: number) {
  const result = await pool.query<RestaurantRow>(
    `
      SELECT r.*, rc.name AS category_name
      FROM restaurant r
      LEFT JOIN restaurant_category rc ON rc.id = r.category_id
      WHERE r.id = $1
      LIMIT 1
    `,
    [restaurantId],
  )

  return result.rows[0] ? toRestaurant(result.rows[0]) : null
}

export async function updateRestaurant(payload: AdminRestaurantUpdatePayload & {
  restaurantId: number
  categoryId: number
}) {
  const result = await pool.query<RestaurantRow>(
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
        (SELECT name FROM restaurant_category WHERE id = restaurant.category_id) AS category_name
    `,
    [
      payload.restaurantId,
      payload.categoryId,
      payload.name,
      payload.description || null,
      payload.phone || null,
      payload.email || null,
      payload.imageUrl || null,
      payload.isActive,
    ],
  )

  return result.rows[0] ? toRestaurant(result.rows[0]) : null
}

export async function updateRestaurantStatus(restaurantId: number, isActive: boolean) {
  const result = await pool.query<RestaurantRow>(
    `
      UPDATE restaurant
      SET is_active = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *,
        (SELECT name FROM restaurant_category WHERE id = restaurant.category_id) AS category_name
    `,
    [restaurantId, isActive],
  )

  return result.rows[0] ? toRestaurant(result.rows[0]) : null
}

export async function getOrCreateRestaurantCategory(categoryName: string) {
  const name = categoryName.trim() || 'General'
  const result = await pool.query<{ id: string }>(
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

async function createCourierForUser(
  client: PoolClient,
  userId: number,
  payload: CreateCourierPayload,
) {
  const result = await client.query<CourierRow>(
    `
      INSERT INTO courier (user_id, phone, vehicle_type, is_available)
      VALUES ($1, $2, $3, TRUE)
      RETURNING *,
        (SELECT name FROM "user" WHERE id = courier.user_id) AS name,
        (SELECT email FROM "user" WHERE id = courier.user_id) AS email
    `,
    [userId, payload.phone, payload.vehicleType || null],
  )

  return toCourier(result.rows[0])
}
