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
  is_online: boolean
  current_latitude: string | null
  current_longitude: string | null
  last_location_at: Date | null
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

type OrderVolumeRow = {
  date: string
  orders: string
}

type RevenueVolumeRow = {
  date: string
  revenue: string
}

type OrderStatusDistributionRow = {
  status: string
  orders: string
}

type AnalyticsSummaryRow = {
  total_amount: string
  completed_count: string
  average_amount: string
  active_count: string
  this_week_amount: string
  last_week_amount: string
  this_month_amount: string
  last_month_amount: string
}

type AnalyticsDayRow = {
  date: string
  amount: string
  count: string
}

type DriverDeliveryHistoryRow = {
  id: string
  order_id: string
  status: string
  restaurant_name: string
  customer_name: string
  total: string
  earning: string
  created_at: Date
  delivered_at: Date | null
}

type RestaurantRow = {
  id: string
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
    isOnline: row.is_online,
    currentLatitude: row.current_latitude === null ? null : Number(row.current_latitude),
    currentLongitude: row.current_longitude === null ? null : Number(row.current_longitude),
    lastLocationAt: row.last_location_at,
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

export async function getOrderVolumeByDay(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 31))
  const result = await pool.query<OrderVolumeRow>(
    `
      WITH calendar_days AS (
        SELECT generate_series(
          CURRENT_DATE - ($1 - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::DATE AS day
      )
      SELECT
        TO_CHAR(calendar_days.day, 'YYYY-MM-DD') AS date,
        COUNT(o.id)::TEXT AS orders
      FROM calendar_days
      LEFT JOIN "order" o
        ON o.created_at >= calendar_days.day
        AND o.created_at < calendar_days.day + INTERVAL '1 day'
      GROUP BY calendar_days.day
      ORDER BY calendar_days.day
    `,
    [safeDays],
  )

  return result.rows.map((row) => ({
    date: row.date,
    orders: Number(row.orders),
  }))
}

export async function getRevenueVolumeByDay(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 31))
  const result = await pool.query<RevenueVolumeRow>(
    `
      WITH calendar_days AS (
        SELECT generate_series(
          CURRENT_DATE - ($1 - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::DATE AS day
      )
      SELECT
        TO_CHAR(calendar_days.day, 'YYYY-MM-DD') AS date,
        COALESCE(
          SUM(
            CASE WHEN order_status.name = 'cancelled' THEN 0 ELSE order_row.total END
          ),
          0
        )::TEXT AS revenue
      FROM calendar_days
      LEFT JOIN "order" order_row
        ON order_row.created_at >= calendar_days.day
        AND order_row.created_at < calendar_days.day + INTERVAL '1 day'
      LEFT JOIN order_status ON order_status.id = order_row.status_id
      GROUP BY calendar_days.day
      ORDER BY calendar_days.day
    `,
    [safeDays],
  )

  return result.rows.map((row) => ({
    date: row.date,
    revenue: Number(row.revenue),
  }))
}

export async function getOrderStatusDistribution(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 31))
  const result = await pool.query<OrderStatusDistributionRow>(
    `
      SELECT
        order_status.name AS status,
        COUNT(order_row.id)::TEXT AS orders
      FROM order_status
      LEFT JOIN "order" order_row
        ON order_row.status_id = order_status.id
        AND order_row.created_at >= CURRENT_DATE - ($1 - 1) * INTERVAL '1 day'
        AND order_row.created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY order_status.id, order_status.name
      ORDER BY order_status.id
    `,
    [safeDays],
  )

  return result.rows.map((row) => ({
    status: row.status,
    orders: Number(row.orders),
  }))
}

function toAnalyticsSummary(row: AnalyticsSummaryRow) {
  return {
    totalAmount: Number(row.total_amount),
    completedCount: Number(row.completed_count),
    averageAmount: Number(row.average_amount),
    activeCount: Number(row.active_count),
    thisWeekAmount: Number(row.this_week_amount),
    lastWeekAmount: Number(row.last_week_amount),
    thisMonthAmount: Number(row.this_month_amount),
    lastMonthAmount: Number(row.last_month_amount),
  }
}

export async function getRestaurantRevenueSummary(restaurantId: number) {
  const result = await pool.query<AnalyticsSummaryRow>(
    `
      SELECT
        COALESCE(SUM(o.subtotal) FILTER (WHERE os.name = 'delivered'), 0)::TEXT AS total_amount,
        COUNT(o.id) FILTER (WHERE os.name = 'delivered')::TEXT AS completed_count,
        COALESCE(AVG(o.subtotal) FILTER (WHERE os.name = 'delivered'), 0)::TEXT AS average_amount,
        COUNT(o.id) FILTER (WHERE os.name NOT IN ('delivered', 'cancelled'))::TEXT AS active_count,
        COALESCE(SUM(o.subtotal) FILTER (
          WHERE os.name = 'delivered' AND o.created_at >= DATE_TRUNC('week', CURRENT_DATE)
        ), 0)::TEXT AS this_week_amount,
        COALESCE(SUM(o.subtotal) FILTER (
          WHERE os.name = 'delivered'
            AND o.created_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
            AND o.created_at < DATE_TRUNC('week', CURRENT_DATE)
        ), 0)::TEXT AS last_week_amount,
        COALESCE(SUM(o.subtotal) FILTER (
          WHERE os.name = 'delivered' AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0)::TEXT AS this_month_amount,
        COALESCE(SUM(o.subtotal) FILTER (
          WHERE os.name = 'delivered'
            AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND o.created_at < DATE_TRUNC('month', CURRENT_DATE)
        ), 0)::TEXT AS last_month_amount
      FROM "order" o
      INNER JOIN order_status os ON os.id = o.status_id
      WHERE o.restaurant_id = $1
    `,
    [restaurantId],
  )

  return toAnalyticsSummary(result.rows[0])
}

export async function getRestaurantRevenueByDay(restaurantId: number, days = 7) {
  const safeDays = Math.max(1, Math.min(days, 31))
  const result = await pool.query<AnalyticsDayRow>(
    `
      WITH calendar_days AS (
        SELECT generate_series(
          CURRENT_DATE - ($2 - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::DATE AS day
      )
      SELECT
        TO_CHAR(calendar_days.day, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(o.subtotal) FILTER (WHERE os.name = 'delivered'), 0)::TEXT AS amount,
        COUNT(o.id) FILTER (WHERE os.name = 'delivered')::TEXT AS count
      FROM calendar_days
      LEFT JOIN "order" o
        ON o.restaurant_id = $1
        AND o.created_at >= calendar_days.day
        AND o.created_at < calendar_days.day + INTERVAL '1 day'
      LEFT JOIN order_status os ON os.id = o.status_id
      GROUP BY calendar_days.day
      ORDER BY calendar_days.day
    `,
    [restaurantId, safeDays],
  )

  return result.rows.map((row) => ({
    date: row.date,
    amount: Number(row.amount),
    count: Number(row.count),
  }))
}

export async function listRecentRestaurantOrders(restaurantId: number) {
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
      WHERE o.restaurant_id = $1
      ORDER BY o.created_at DESC
      LIMIT 8
    `,
    [restaurantId],
  )

  return result.rows.map(toOrder)
}

export async function getDriverEarningsSummary(courierId: number) {
  const result = await pool.query<AnalyticsSummaryRow>(
    `
      SELECT
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE ds.name = 'delivered'), 0)::TEXT AS total_amount,
        COUNT(d.id) FILTER (WHERE ds.name = 'delivered')::TEXT AS completed_count,
        COALESCE(AVG(o.delivery_fee) FILTER (WHERE ds.name = 'delivered'), 0)::TEXT AS average_amount,
        COUNT(d.id) FILTER (WHERE ds.name NOT IN ('delivered', 'failed', 'cancelled'))::TEXT AS active_count,
        COALESCE(SUM(o.delivery_fee) FILTER (
          WHERE ds.name = 'delivered' AND d.delivered_at >= DATE_TRUNC('week', CURRENT_DATE)
        ), 0)::TEXT AS this_week_amount,
        COALESCE(SUM(o.delivery_fee) FILTER (
          WHERE ds.name = 'delivered'
            AND d.delivered_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
            AND d.delivered_at < DATE_TRUNC('week', CURRENT_DATE)
        ), 0)::TEXT AS last_week_amount,
        COALESCE(SUM(o.delivery_fee) FILTER (
          WHERE ds.name = 'delivered' AND d.delivered_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0)::TEXT AS this_month_amount,
        COALESCE(SUM(o.delivery_fee) FILTER (
          WHERE ds.name = 'delivered'
            AND d.delivered_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND d.delivered_at < DATE_TRUNC('month', CURRENT_DATE)
        ), 0)::TEXT AS last_month_amount
      FROM delivery d
      INNER JOIN delivery_status ds ON ds.id = d.status_id
      INNER JOIN "order" o ON o.id = d.order_id
      WHERE d.courier_id = $1
    `,
    [courierId],
  )

  return toAnalyticsSummary(result.rows[0])
}

export async function getDriverEarningsByDay(courierId: number, days = 7) {
  const safeDays = Math.max(1, Math.min(days, 31))
  const result = await pool.query<AnalyticsDayRow>(
    `
      WITH calendar_days AS (
        SELECT generate_series(
          CURRENT_DATE - ($2 - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::DATE AS day
      )
      SELECT
        TO_CHAR(calendar_days.day, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE ds.name = 'delivered'), 0)::TEXT AS amount,
        COUNT(d.id) FILTER (WHERE ds.name = 'delivered')::TEXT AS count
      FROM calendar_days
      LEFT JOIN delivery d
        ON d.courier_id = $1
        AND d.delivered_at >= calendar_days.day
        AND d.delivered_at < calendar_days.day + INTERVAL '1 day'
      LEFT JOIN delivery_status ds ON ds.id = d.status_id
      LEFT JOIN "order" o ON o.id = d.order_id
      GROUP BY calendar_days.day
      ORDER BY calendar_days.day
    `,
    [courierId, safeDays],
  )

  return result.rows.map((row) => ({
    date: row.date,
    amount: Number(row.amount),
    count: Number(row.count),
  }))
}

export async function listRecentDriverDeliveries(courierId: number) {
  const result = await pool.query<DriverDeliveryHistoryRow>(
    `
      SELECT
        d.id,
        d.order_id,
        ds.name AS status,
        restaurant.name AS restaurant_name,
        customer.name AS customer_name,
        o.total,
        o.delivery_fee AS earning,
        d.created_at,
        d.delivered_at
      FROM delivery d
      INNER JOIN delivery_status ds ON ds.id = d.status_id
      INNER JOIN "order" o ON o.id = d.order_id
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      INNER JOIN "user" customer ON customer.id = o.user_id
      WHERE d.courier_id = $1
      ORDER BY d.created_at DESC
      LIMIT 8
    `,
    [courierId],
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    orderId: Number(row.order_id),
    status: row.status,
    restaurantName: row.restaurant_name,
    customerName: row.customer_name,
    total: Number(row.total),
    earning: Number(row.earning),
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  }))
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
        ''::TEXT AS restaurant_name,
        courier.phone AS courier_phone,
        courier.vehicle_type,
        courier.is_available
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
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
        ''::TEXT AS restaurant_name,
        courier.phone AS courier_phone,
        courier.vehicle_type,
        courier.is_available
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
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
