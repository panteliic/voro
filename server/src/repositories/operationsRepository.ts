import type { PoolClient } from 'pg'
import { pool } from '../database/pool'

type RestaurantOperationsRow = {
  id: string
  delivery_radius_km: string
  opening_hours: Record<string, unknown>
  is_accepting_orders: boolean
}

type OrderOwnerRow = {
  id: string
  user_id: string
  restaurant_id: string
  status: string
  delivery_status: string | null
  courier_id: string | null
  courier_user_id: string | null
}

type FavoriteRow = {
  restaurant_id: string
  created_at: Date
}

type ReviewRow = {
  id: string
  order_id: string
  user_id: string
  restaurant_id: string
  rating: number
  comment: string | null
  created_at: Date
  updated_at: Date
}

type IssueRow = {
  id: string
  order_id: string
  reporter_user_id: string
  category: string
  description: string
  status: string
  resolution_note: string | null
  created_at: Date
  updated_at: Date
}

type MessageRow = {
  id: string
  order_id: string
  sender_user_id: string
  sender_role: 'customer' | 'courier'
  sender_name: string
  body: string
  read_at: Date | null
  created_at: Date
}

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  read_at: Date | null
  created_at: Date
}

type ActiveOperationRow = {
  id: string
  customer_name: string
  restaurant_id: string
  restaurant_name: string
  restaurant_latitude: string | null
  restaurant_longitude: string | null
  customer_latitude: string | null
  customer_longitude: string | null
  status: string
  delivery_status: string | null
  courier_id: string | null
  courier_name: string | null
  courier_latitude: string | null
  courier_longitude: string | null
  dispatch_status: string | null
  dispatch_error: string | null
  total: string
  created_at: Date
}

function toOperations(row: RestaurantOperationsRow) {
  return {
    restaurantId: Number(row.id),
    deliveryRadiusKm: Number(row.delivery_radius_km),
    openingHours: row.opening_hours || {},
    isAcceptingOrders: row.is_accepting_orders,
  }
}

function toReview(row: ReviewRow) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    userId: Number(row.user_id),
    restaurantId: Number(row.restaurant_id),
    rating: row.rating,
    comment: row.comment || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toIssue(row: IssueRow) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    reporterUserId: Number(row.reporter_user_id),
    category: row.category,
    description: row.description,
    status: row.status,
    resolutionNote: row.resolution_note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toMessage(row: MessageRow) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    senderUserId: Number(row.sender_user_id),
    senderRole: row.sender_role,
    senderName: row.sender_name,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

function toNotification(row: NotificationRow) {
  return {
    id: Number(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data || {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export async function getRestaurantOperations(restaurantId: number) {
  const result = await pool.query<RestaurantOperationsRow>(
    `SELECT id, delivery_radius_km, opening_hours, is_accepting_orders FROM restaurant WHERE id = $1`,
    [restaurantId],
  )
  return result.rows[0] ? toOperations(result.rows[0]) : null
}

export async function updateRestaurantOperations(
  restaurantId: number,
  payload: { deliveryRadiusKm: number; openingHours: Record<string, unknown>; isAcceptingOrders: boolean },
) {
  const result = await pool.query<RestaurantOperationsRow>(
    `
      UPDATE restaurant
      SET
        delivery_radius_km = $2,
        opening_hours = $3::JSONB,
        is_accepting_orders = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, delivery_radius_km, opening_hours, is_accepting_orders
    `,
    [restaurantId, payload.deliveryRadiusKm, JSON.stringify(payload.openingHours), payload.isAcceptingOrders],
  )
  return result.rows[0] ? toOperations(result.rows[0]) : null
}

export async function listFavoriteRestaurantIds(userId: number) {
  const result = await pool.query<FavoriteRow>(
    `SELECT restaurant_id, created_at FROM restaurant_favorite WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows.map((row) => Number(row.restaurant_id))
}

export async function setFavorite(userId: number, restaurantId: number, isFavorite: boolean) {
  if (isFavorite) {
    await pool.query(
      `INSERT INTO restaurant_favorite (user_id, restaurant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, restaurantId],
    )
  } else {
    await pool.query(
      `DELETE FROM restaurant_favorite WHERE user_id = $1 AND restaurant_id = $2`,
      [userId, restaurantId],
    )
  }

  return { restaurantId, isFavorite }
}

export async function getOrderOwner(orderId: number) {
  const result = await pool.query<OrderOwnerRow>(
    `
      SELECT
        o.id,
        o.user_id,
        o.restaurant_id,
        os.name AS status,
        ds.name AS delivery_status,
        d.courier_id,
        courier.user_id AS courier_user_id
      FROM "order" o
      INNER JOIN order_status os ON os.id = o.status_id
      LEFT JOIN delivery d ON d.order_id = o.id
      LEFT JOIN delivery_status ds ON ds.id = d.status_id
      LEFT JOIN courier ON courier.id = d.courier_id
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  )
  return result.rows[0] || null
}

export async function cancelCustomerOrder(userId: number, orderId: number, reason: string) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query<{ id: string }>(
      `
        UPDATE "order"
        SET
          status_id = (SELECT id FROM order_status WHERE name = 'cancelled'),
          cancelled_at = NOW(),
          cancellation_reason = $3,
          updated_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND status_id = (SELECT id FROM order_status WHERE name = 'pending')
        RETURNING id
      `,
      [orderId, userId, reason || null],
    )

    if (!result.rows[0]) {
      await client.query('ROLLBACK')
      return false
    }

    await client.query(`UPDATE payment SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1`, [orderId])
    await client.query(`DELETE FROM delivery_dispatch_job WHERE order_id = $1`, [orderId])
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function createReview(
  userId: number,
  orderId: number,
  payload: { rating: number; comment: string },
) {
  const result = await pool.query<ReviewRow>(
    `
      INSERT INTO order_review (order_id, user_id, restaurant_id, rating, comment)
      SELECT o.id, o.user_id, o.restaurant_id, $3, $4
      FROM "order" o
      INNER JOIN order_status os ON os.id = o.status_id
      WHERE o.id = $1 AND o.user_id = $2 AND os.name = 'delivered'
      ON CONFLICT (order_id) DO UPDATE
      SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
    `,
    [orderId, userId, payload.rating, payload.comment || null],
  )
  return result.rows[0] ? toReview(result.rows[0]) : null
}

export async function createIssue(
  userId: number,
  orderId: number,
  payload: { category: string; description: string },
) {
  const result = await pool.query<IssueRow>(
    `
      INSERT INTO order_issue (order_id, reporter_user_id, category, description)
      SELECT id, user_id, $3, $4
      FROM "order"
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [orderId, userId, payload.category, payload.description],
  )
  return result.rows[0] ? toIssue(result.rows[0]) : null
}

export async function canAccessOrderConversation(orderId: number, userId: number, role: 'customer' | 'courier') {
  const result = await pool.query(
    role === 'customer'
      ? `SELECT 1 FROM "order" WHERE id = $1 AND user_id = $2`
      : `
          SELECT 1
          FROM delivery
          INNER JOIN courier ON courier.id = delivery.courier_id
          WHERE delivery.order_id = $1 AND courier.user_id = $2
        `,
    [orderId, userId],
  )
  return (result.rowCount || 0) > 0
}

export async function listOrderMessages(orderId: number, userId: number, role: 'customer' | 'courier') {
  if (!(await canAccessOrderConversation(orderId, userId, role))) return null

  await pool.query(
    `
      UPDATE order_message
      SET read_at = NOW()
      WHERE order_id = $1 AND sender_user_id <> $2 AND read_at IS NULL
    `,
    [orderId, userId],
  )

  const result = await pool.query<MessageRow>(
    `
      SELECT message.*, sender.name AS sender_name
      FROM order_message message
      INNER JOIN "user" sender ON sender.id = message.sender_user_id
      WHERE message.order_id = $1
      ORDER BY message.created_at ASC
      LIMIT 200
    `,
    [orderId],
  )
  return result.rows.map(toMessage)
}

export async function createOrderMessage(
  orderId: number,
  userId: number,
  role: 'customer' | 'courier',
  body: string,
) {
  if (!(await canAccessOrderConversation(orderId, userId, role))) return null

  const result = await pool.query<MessageRow>(
    `
      INSERT INTO order_message (order_id, sender_user_id, sender_role, body)
      VALUES ($1, $2, $3, $4)
      RETURNING *, (SELECT name FROM "user" WHERE id = $2) AS sender_name
    `,
    [orderId, userId, role, body],
  )
  return toMessage(result.rows[0])
}

export async function createUserNotification(
  userId: number,
  payload: { type: string; title: string; body: string; data?: Record<string, unknown> },
) {
  const result = await pool.query<NotificationRow>(
    `
      INSERT INTO app_notification (recipient_user_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5::JSONB)
      RETURNING id, type, title, body, data, read_at, created_at
    `,
    [userId, payload.type, payload.title, payload.body, JSON.stringify(payload.data || {})],
  )
  return result.rows[0] ? toNotification(result.rows[0]) : null
}

export async function createRestaurantNotification(
  restaurantId: number,
  payload: { type: string; title: string; body: string; data?: Record<string, unknown> },
) {
  await pool.query(
    `
      INSERT INTO app_notification (restaurant_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5::JSONB)
    `,
    [restaurantId, payload.type, payload.title, payload.body, JSON.stringify(payload.data || {})],
  )
}

export async function listUserNotifications(userId: number) {
  const result = await pool.query<NotificationRow>(
    `
      SELECT id, type, title, body, data, read_at, created_at
      FROM app_notification
      WHERE recipient_user_id = $1
      ORDER BY created_at DESC
      LIMIT 80
    `,
    [userId],
  )
  return result.rows.map(toNotification)
}

export async function listRestaurantNotifications(restaurantId: number) {
  const result = await pool.query<NotificationRow>(
    `
      SELECT id, type, title, body, data, read_at, created_at
      FROM app_notification
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
      LIMIT 80
    `,
    [restaurantId],
  )
  return result.rows.map(toNotification)
}

export async function markUserNotificationRead(userId: number, notificationId: number) {
  const result = await pool.query<{ id: string }>(
    `
      UPDATE app_notification
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1 AND recipient_user_id = $2
      RETURNING id
    `,
    [notificationId, userId],
  )
  return Boolean(result.rows[0])
}

export async function markRestaurantNotificationRead(restaurantId: number, notificationId: number) {
  const result = await pool.query<{ id: string }>(
    `
      UPDATE app_notification
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1 AND restaurant_id = $2
      RETURNING id
    `,
    [notificationId, restaurantId],
  )
  return Boolean(result.rows[0])
}

export async function listOpenIssues() {
  const result = await pool.query<IssueRow>(
    `SELECT * FROM order_issue WHERE status <> 'resolved' ORDER BY created_at ASC LIMIT 100`,
  )
  return result.rows.map(toIssue)
}

export async function resolveIssue(
  issueId: number,
  adminUserId: number,
  status: 'in_review' | 'resolved',
  resolutionNote: string,
) {
  const result = await pool.query<IssueRow>(
    `
      UPDATE order_issue
      SET
        status = $3,
        resolution_note = $4,
        resolved_by_user_id = CASE WHEN $3 = 'resolved' THEN $2 ELSE resolved_by_user_id END,
        resolved_at = CASE WHEN $3 = 'resolved' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [issueId, adminUserId, status, resolutionNote || null],
  )
  return result.rows[0] ? toIssue(result.rows[0]) : null
}

export async function listActiveOperations() {
  const result = await pool.query<ActiveOperationRow>(
    `
      SELECT
        o.id,
        customer.name AS customer_name,
        restaurant.id AS restaurant_id,
        restaurant.name AS restaurant_name,
        restaurant.latitude AS restaurant_latitude,
        restaurant.longitude AS restaurant_longitude,
        address.latitude AS customer_latitude,
        address.longitude AS customer_longitude,
        os.name AS status,
        ds.name AS delivery_status,
        courier.id AS courier_id,
        courier_user.name AS courier_name,
        courier.current_latitude AS courier_latitude,
        courier.current_longitude AS courier_longitude,
        dispatch_job.status AS dispatch_status,
        dispatch_job.last_error AS dispatch_error,
        o.total,
        o.created_at
      FROM "order" o
      INNER JOIN "user" customer ON customer.id = o.user_id
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      INNER JOIN order_status os ON os.id = o.status_id
      LEFT JOIN address ON address.id = o.address_id
      LEFT JOIN delivery d ON d.order_id = o.id
      LEFT JOIN delivery_status ds ON ds.id = d.status_id
      LEFT JOIN courier ON courier.id = d.courier_id
      LEFT JOIN "user" courier_user ON courier_user.id = courier.user_id
      LEFT JOIN delivery_dispatch_job dispatch_job ON dispatch_job.order_id = o.id
      WHERE os.name NOT IN ('delivered', 'cancelled')
      ORDER BY o.created_at ASC
    `,
  )
  return result.rows.map((row) => ({
    id: Number(row.id),
    customerName: row.customer_name,
    restaurantId: Number(row.restaurant_id),
    restaurantName: row.restaurant_name,
    restaurantLatitude: row.restaurant_latitude === null ? null : Number(row.restaurant_latitude),
    restaurantLongitude: row.restaurant_longitude === null ? null : Number(row.restaurant_longitude),
    customerLatitude: row.customer_latitude === null ? null : Number(row.customer_latitude),
    customerLongitude: row.customer_longitude === null ? null : Number(row.customer_longitude),
    status: row.status,
    deliveryStatus: row.delivery_status || '',
    courierId: row.courier_id ? Number(row.courier_id) : null,
    courierName: row.courier_name || '',
    courierLatitude: row.courier_latitude === null ? null : Number(row.courier_latitude),
    courierLongitude: row.courier_longitude === null ? null : Number(row.courier_longitude),
    dispatchStatus: row.dispatch_status || '',
    dispatchError: row.dispatch_error || '',
    total: Number(row.total),
    createdAt: row.created_at,
  }))
}

export async function assignCourierToOrder(orderId: number, courierId: number) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const order = await client.query<OrderOwnerRow>(
      `
        SELECT
          o.id, o.user_id, o.restaurant_id, os.name AS status,
          ds.name AS delivery_status, d.courier_id, current_courier.user_id AS courier_user_id
        FROM "order" o
        INNER JOIN order_status os ON os.id = o.status_id
        LEFT JOIN delivery d ON d.order_id = o.id
        LEFT JOIN delivery_status ds ON ds.id = d.status_id
        LEFT JOIN courier current_courier ON current_courier.id = d.courier_id
        WHERE o.id = $1
        FOR UPDATE
      `,
      [orderId],
    )
    const row = order.rows[0]
    if (!row || ['delivered', 'cancelled'].includes(row.status) || ['picked_up', 'on_the_way'].includes(row.delivery_status || '')) {
      await client.query('ROLLBACK')
      return null
    }

    const courier = await client.query<{ id: string; user_id: string; name: string }>(
      `
        SELECT courier.id, courier.user_id, u.name
        FROM courier
        INNER JOIN "user" u ON u.id = courier.user_id
        WHERE courier.id = $1 AND u.is_active = TRUE
        FOR UPDATE
      `,
      [courierId],
    )
    if (!courier.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    const previousCourierId = row.courier_id ? Number(row.courier_id) : null
    await client.query(
      `
        INSERT INTO delivery (order_id, courier_id, status_id)
        VALUES ($1, $2, (SELECT id FROM delivery_status WHERE name = 'assigned'))
        ON CONFLICT (order_id) DO UPDATE
        SET courier_id = EXCLUDED.courier_id,
            status_id = (SELECT id FROM delivery_status WHERE name = 'assigned'),
            picked_up_at = NULL,
            delivered_at = NULL,
            updated_at = NOW()
      `,
      [orderId, courierId],
    )
    await client.query(
      `
        INSERT INTO delivery_dispatch_job (order_id, status, assigned_courier_id, last_error, next_attempt_at)
        VALUES ($1, 'assigned', $2, NULL, NOW())
        ON CONFLICT (order_id) DO UPDATE
        SET status = 'assigned', assigned_courier_id = EXCLUDED.assigned_courier_id, last_error = NULL, updated_at = NOW()
      `,
      [orderId, courierId],
    )
    await client.query(
      `UPDATE delivery_dispatch_offer SET status = 'expired', updated_at = NOW() WHERE order_id = $1 AND status = 'pending'`,
      [orderId],
    )
    await client.query(`UPDATE courier SET is_available = FALSE, updated_at = NOW() WHERE id = $1`, [courierId])

    if (previousCourierId && previousCourierId !== courierId) {
      await client.query(
        `
          UPDATE courier
          SET is_available = TRUE, updated_at = NOW()
          WHERE id = $1
            AND NOT EXISTS (
              SELECT 1 FROM delivery
              INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
              WHERE delivery.courier_id = $1
                AND delivery_status.name NOT IN ('delivered', 'failed', 'cancelled')
            )
        `,
        [previousCourierId],
      )
    }

    await client.query('COMMIT')
    return {
      customerUserId: Number(row.user_id),
      restaurantId: Number(row.restaurant_id),
      courierUserId: Number(courier.rows[0].user_id),
      courierName: courier.rows[0].name,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
