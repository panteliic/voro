import { pool } from '../database/pool'
import type {
  DriverDelivery,
  DriverHistoryItem,
  DriverOffer,
  DriverProfile,
} from '../types/driver'

type DriverProfileRow = {
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

type DriverDeliveryRow = {
  id: string
  order_id: string
  status: DriverDelivery['status']
  order_status: string
  restaurant_name: string
  restaurant_address: string | null
  restaurant_latitude: string
  restaurant_longitude: string
  customer_name: string
  customer_address: string | null
  customer_latitude: string
  customer_longitude: string
  total: string
  payment_method: string | null
  cash_tendered: string | null
  change_due: string | null
  pickup_code: string | null
  created_at: Date
  picked_up_at: Date | null
}

type DriverOfferRow = {
  id: string
  order_id: string
  restaurant_name: string
  restaurant_address: string | null
  restaurant_latitude: string
  restaurant_longitude: string
  customer_name: string
  customer_address: string | null
  customer_latitude: string
  customer_longitude: string
  total: string
  payment_method: string | null
  cash_tendered: string | null
  change_due: string | null
  expires_at: Date
  created_at: Date
}

type DriverHistoryRow = {
  delivery_id: string
  order_id: string
  restaurant_name: string
  customer_address: string | null
  total: string
  picked_up_at: Date | null
  delivered_at: Date
}

type WorkSessionRow = {
  started_at: Date
  ended_at: Date | null
  updated_at: Date
}

type DeliveredTotalRow = {
  delivered_at: Date
  total: string
}

function toDriverProfile(row: DriverProfileRow): DriverProfile {
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

function toDriverDelivery(row: DriverDeliveryRow): DriverDelivery {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    status: row.status,
    orderStatus: row.order_status,
    restaurantName: row.restaurant_name,
    restaurantAddress: row.restaurant_address || '',
    restaurantLatitude: Number(row.restaurant_latitude),
    restaurantLongitude: Number(row.restaurant_longitude),
    customerName: row.customer_name,
    customerAddress: row.customer_address || '',
    customerLatitude: Number(row.customer_latitude),
    customerLongitude: Number(row.customer_longitude),
    total: Number(row.total),
    paymentMethod: row.payment_method === 'cash' ? 'cash' : 'card',
    cashTendered: row.cash_tendered === null ? null : Number(row.cash_tendered),
    changeDue: Number(row.change_due || 0),
    pickupCode: row.pickup_code || '',
    createdAt: row.created_at,
    pickedUpAt: row.picked_up_at,
  }
}

function toDriverOffer(row: DriverOfferRow): DriverOffer {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    restaurantName: row.restaurant_name,
    restaurantAddress: row.restaurant_address || '',
    restaurantLatitude: Number(row.restaurant_latitude),
    restaurantLongitude: Number(row.restaurant_longitude),
    customerName: row.customer_name,
    customerAddress: row.customer_address || '',
    customerLatitude: Number(row.customer_latitude),
    customerLongitude: Number(row.customer_longitude),
    total: Number(row.total),
    paymentMethod: row.payment_method === 'cash' ? 'cash' : 'card',
    cashTendered: row.cash_tendered === null ? null : Number(row.cash_tendered),
    changeDue: Number(row.change_due || 0),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

function toDriverHistory(row: DriverHistoryRow): DriverHistoryItem {
  return {
    deliveryId: Number(row.delivery_id),
    orderId: Number(row.order_id),
    restaurantName: row.restaurant_name,
    customerAddress: row.customer_address || '',
    total: Number(row.total),
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
  }
}

const deliverySelect = `
  SELECT
    delivery.id,
    delivery.order_id,
    delivery_status.name AS status,
    order_status.name AS order_status,
    restaurant.name AS restaurant_name,
    NULLIF(CONCAT_WS(', ', restaurant.name, restaurant.phone), '') AS restaurant_address,
    restaurant.latitude AS restaurant_latitude,
    restaurant.longitude AS restaurant_longitude,
    customer.name AS customer_name,
    NULLIF(CONCAT_WS(', ', address.label, address.street, address.city), '') AS customer_address,
    address.latitude AS customer_latitude,
    address.longitude AS customer_longitude,
    "order".total,
    payment.method AS payment_method,
    payment.cash_tendered,
    payment.change_due,
    delivery.pickup_code,
    delivery.created_at,
    delivery.picked_up_at
  FROM delivery
  INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
  INNER JOIN "order" ON "order".id = delivery.order_id
  INNER JOIN order_status ON order_status.id = "order".status_id
  INNER JOIN restaurant ON restaurant.id = "order".restaurant_id
  INNER JOIN "user" customer ON customer.id = "order".user_id
  LEFT JOIN address ON address.id = "order".address_id
  LEFT JOIN payment ON payment.order_id = "order".id
`

export async function findDriverByUserId(userId: number) {
  const result = await pool.query<DriverProfileRow>(
    `
      SELECT courier.*, u.name, u.email
      FROM courier
      INNER JOIN "user" u ON u.id = courier.user_id
      WHERE courier.user_id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] ? toDriverProfile(result.rows[0]) : null
}

export async function updateDriverPresence(
  userId: number,
  payload: { isOnline: boolean; latitude: number | null; longitude: number | null },
) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query<DriverProfileRow>(
      `
        UPDATE courier
        SET
          is_online = $2,
          current_latitude = COALESCE($3, current_latitude),
          current_longitude = COALESCE($4, current_longitude),
          last_location_at = CASE
            WHEN $3 IS NOT NULL AND $4 IS NOT NULL THEN NOW()
            ELSE last_location_at
          END,
          is_available = CASE
            WHEN $2 = FALSE THEN FALSE
            WHEN NOT EXISTS (
              SELECT 1
              FROM delivery
              INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
              WHERE delivery.courier_id = courier.id
                AND delivery_status.name NOT IN ('delivered', 'failed', 'cancelled')
            ) THEN TRUE
            ELSE FALSE
          END,
          updated_at = NOW()
        WHERE courier.user_id = $1
        RETURNING *,
          (SELECT name FROM "user" WHERE id = courier.user_id) AS name,
          (SELECT email FROM "user" WHERE id = courier.user_id) AS email
      `,
      [userId, payload.isOnline, payload.latitude, payload.longitude],
    )
    const row = result.rows[0]

    if (row) {
      if (payload.isOnline) {
        await client.query(
          `
            INSERT INTO courier_work_session (courier_id)
            VALUES ($1)
            ON CONFLICT (courier_id) WHERE ended_at IS NULL DO NOTHING
          `,
          [row.id],
        )
        await client.query(
          `
            UPDATE courier_work_session
            SET updated_at = NOW()
            WHERE courier_id = $1 AND ended_at IS NULL
          `,
          [row.id],
        )
      } else {
        await client.query(
          `
            UPDATE courier_work_session
            SET ended_at = NOW(), updated_at = NOW()
            WHERE courier_id = $1 AND ended_at IS NULL
          `,
          [row.id],
        )
      }
    }

    await client.query('COMMIT')
    return row ? toDriverProfile(row) : null
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function expireStaleDriverPresence() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query<{ id: string }>(
      `
        UPDATE courier
        SET is_online = FALSE, is_available = FALSE, updated_at = NOW()
        WHERE is_online = TRUE
          AND (last_location_at IS NULL OR last_location_at < NOW() - INTERVAL '45 seconds')
        RETURNING id
      `,
    )

    if (result.rows.length > 0) {
      await client.query(
        `
          UPDATE courier_work_session
          SET ended_at = NOW(), updated_at = NOW()
          WHERE ended_at IS NULL
            AND courier_id = ANY($1::BIGINT[])
        `,
        [result.rows.map((row) => Number(row.id))],
      )
    }

    await client.query('COMMIT')
    return result.rows.map((row) => Number(row.id))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function recordActiveDeliveryLocation(
  courierId: number,
  latitude: number,
  longitude: number,
) {
  await pool.query(
    `
      INSERT INTO delivery_location (delivery_id, courier_id, latitude, longitude)
      SELECT delivery.id, delivery.courier_id, $2, $3
      FROM delivery
      INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
      WHERE delivery.courier_id = $1
        AND delivery_status.name NOT IN ('delivered', 'failed', 'cancelled')
      ORDER BY delivery.updated_at DESC
      LIMIT 1
    `,
    [courierId, latitude, longitude],
  )
}

export async function listActiveDeliveries(courierId: number) {
  const result = await pool.query<DriverDeliveryRow>(
    `
      ${deliverySelect}
      WHERE delivery.courier_id = $1
        AND delivery_status.name IN ('assigned', 'arriving_to_restaurant', 'picked_up', 'on_the_way')
        AND restaurant.latitude IS NOT NULL
        AND restaurant.longitude IS NOT NULL
        AND address.latitude IS NOT NULL
        AND address.longitude IS NOT NULL
      ORDER BY delivery.created_at DESC
    `,
    [courierId],
  )

  return result.rows.map(toDriverDelivery)
}

export async function getActiveDelivery(courierId: number, deliveryId: number) {
  const result = await pool.query<DriverDeliveryRow>(
    `
      ${deliverySelect}
      WHERE delivery.courier_id = $1
        AND delivery.id = $2
        AND delivery_status.name IN ('assigned', 'arriving_to_restaurant', 'picked_up', 'on_the_way')
      LIMIT 1
    `,
    [courierId, deliveryId],
  )

  return result.rows[0] ? toDriverDelivery(result.rows[0]) : null
}

export async function listPendingOffers(courierId: number) {
  const result = await pool.query<DriverOfferRow>(
    `
      SELECT
        offer.id,
        offer.order_id,
        restaurant.name AS restaurant_name,
        NULLIF(CONCAT_WS(', ', restaurant.name, restaurant.phone), '') AS restaurant_address,
        restaurant.latitude AS restaurant_latitude,
        restaurant.longitude AS restaurant_longitude,
        customer.name AS customer_name,
        NULLIF(CONCAT_WS(', ', address.label, address.street, address.city), '') AS customer_address,
        address.latitude AS customer_latitude,
        address.longitude AS customer_longitude,
        "order".total,
        payment.method AS payment_method,
        payment.cash_tendered,
        payment.change_due,
        offer.expires_at,
        offer.created_at
      FROM delivery_dispatch_offer offer
      INNER JOIN delivery_dispatch_job job ON job.id = offer.dispatch_job_id
      INNER JOIN courier ON courier.id = offer.courier_id
      INNER JOIN "order" ON "order".id = offer.order_id
      INNER JOIN restaurant ON restaurant.id = "order".restaurant_id
      INNER JOIN "user" customer ON customer.id = "order".user_id
      LEFT JOIN address ON address.id = "order".address_id
      LEFT JOIN payment ON payment.order_id = "order".id
      WHERE offer.courier_id = $1
        AND offer.status = 'pending'
        AND offer.expires_at > NOW()
        AND job.status IN ('matching', 'waiting_for_driver')
        AND courier.is_online = TRUE
        AND courier.last_location_at >= NOW() - INTERVAL '45 seconds'
        AND restaurant.latitude IS NOT NULL
        AND restaurant.longitude IS NOT NULL
        AND address.latitude IS NOT NULL
        AND address.longitude IS NOT NULL
      ORDER BY offer.expires_at ASC
    `,
    [courierId],
  )

  return result.rows.map(toDriverOffer)
}

export async function acceptDispatchOffer(courierId: number, offerId: number) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const offerResult = await client.query<{
      id: string
      order_id: string
      dispatch_job_id: string
      status: string
      expires_at: Date
    }>(
      `
        SELECT id, order_id, dispatch_job_id, status, expires_at
        FROM delivery_dispatch_offer
        WHERE id = $1 AND courier_id = $2
        FOR UPDATE
      `,
      [offerId, courierId],
    )
    const offer = offerResult.rows[0]

    if (!offer || offer.status !== 'pending' || offer.expires_at <= new Date()) {
      await client.query('ROLLBACK')
      return null
    }

    await client.query('SELECT pg_advisory_xact_lock($1::BIGINT)', [offer.order_id])

    const courierResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM courier
        WHERE id = $1
          AND is_online = TRUE
          AND is_available = TRUE
          AND current_latitude IS NOT NULL
          AND current_longitude IS NOT NULL
          AND last_location_at >= NOW() - INTERVAL '45 seconds'
        FOR UPDATE
      `,
      [courierId],
    )

    if (!courierResult.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    const existingDelivery = await client.query<{ id: string }>(
      'SELECT id FROM delivery WHERE order_id = $1 FOR UPDATE',
      [offer.order_id],
    )

    const eligibleOrder = await client.query<{ id: string }>(
      `
        SELECT "order".id
        FROM "order"
        INNER JOIN order_status ON order_status.id = "order".status_id
        WHERE "order".id = $1 AND order_status.name IN ('accepted', 'preparing', 'ready')
        FOR UPDATE
      `,
      [offer.order_id],
    )

    if (existingDelivery.rows[0] || !eligibleOrder.rows[0]) {
      await client.query(
        `
          UPDATE delivery_dispatch_offer
          SET status = 'expired', updated_at = NOW()
          WHERE order_id = $1 AND status = 'pending'
        `,
        [offer.order_id],
      )
      await client.query('COMMIT')
      return null
    }

    const deliveryResult = await client.query<{ id: string }>(
      `
        INSERT INTO delivery (order_id, courier_id, status_id, pickup_code)
        VALUES (
          $1,
          $2,
          (SELECT id FROM delivery_status WHERE name = 'arriving_to_restaurant'),
          LPAD((($1::BIGINT) % 1000000)::TEXT, 6, '0')
        )
        RETURNING id
      `,
      [offer.order_id, courierId],
    )

    await client.query(
      'UPDATE courier SET is_available = FALSE, updated_at = NOW() WHERE id = $1',
      [courierId],
    )
    await client.query(
      `
        UPDATE delivery_dispatch_offer
        SET
          status = CASE WHEN id = $2 THEN 'accepted' ELSE 'expired' END,
          updated_at = NOW()
        WHERE order_id = $1 AND status = 'pending'
      `,
      [offer.order_id, offer.id],
    )
    await client.query(
      `
        UPDATE delivery_dispatch_job
        SET
          status = 'assigned',
          assigned_courier_id = $2,
          last_error = NULL,
          next_attempt_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [offer.dispatch_job_id, courierId],
    )
    await client.query(
      `
        INSERT INTO delivery_location (delivery_id, courier_id, latitude, longitude)
        SELECT $1, courier.id, courier.current_latitude, courier.current_longitude
        FROM courier
        WHERE courier.id = $2
          AND courier.current_latitude IS NOT NULL
          AND courier.current_longitude IS NOT NULL
      `,
      [deliveryResult.rows[0].id, courierId],
    )

    await client.query('COMMIT')
    return Number(deliveryResult.rows[0].id)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function declineDispatchOffer(courierId: number, offerId: number) {
  const result = await pool.query(
    `
      UPDATE delivery_dispatch_offer
      SET status = 'declined', updated_at = NOW()
      WHERE id = $1
        AND courier_id = $2
        AND status = 'pending'
        AND expires_at > NOW()
    `,
    [offerId, courierId],
  )

  return (result.rowCount ?? 0) > 0
}

export async function setDeliveryStatus(
  courierId: number,
  deliveryId: number,
  status: 'picked_up' | 'on_the_way' | 'delivered',
) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const deliveryResult = await client.query<{ order_id: string; status: string; order_status: string }>(
      `
        SELECT delivery.order_id, delivery_status.name AS status, order_status.name AS order_status
        FROM delivery
        INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
        INNER JOIN "order" ON "order".id = delivery.order_id
        INNER JOIN order_status ON order_status.id = "order".status_id
        WHERE delivery.id = $1 AND delivery.courier_id = $2
        FOR UPDATE
      `,
      [deliveryId, courierId],
    )
    const current = deliveryResult.rows[0]

    if (!current) {
      await client.query('ROLLBACK')
      return null
    }

    const allowed: Record<string, string[]> = {
      assigned: ['picked_up'],
      arriving_to_restaurant: ['picked_up'],
      picked_up: ['on_the_way', 'delivered'],
      on_the_way: ['delivered'],
    }

    if (!allowed[current.status]?.includes(status)) {
      await client.query('ROLLBACK')
      return null
    }

    await client.query(
      `
        UPDATE delivery
        SET
          status_id = (SELECT id FROM delivery_status WHERE name = $2),
          picked_up_at = CASE WHEN $2 = 'picked_up' THEN COALESCE(picked_up_at, NOW()) ELSE picked_up_at END,
          delivered_at = CASE WHEN $2 = 'delivered' THEN NOW() ELSE delivered_at END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [deliveryId, status],
    )

    if (status === 'picked_up') {
      await client.query(
        `
          UPDATE "order"
          SET status_id = (SELECT id FROM order_status WHERE name = 'picked_up'), updated_at = NOW()
          WHERE id = $1
            AND status_id <> (SELECT id FROM order_status WHERE name = 'delivered')
        `,
        [current.order_id],
      )
    }

    if (status === 'delivered') {
      await client.query(
        `
          UPDATE "order"
          SET status_id = (SELECT id FROM order_status WHERE name = 'delivered'), updated_at = NOW()
          WHERE id = $1
        `,
        [current.order_id],
      )
      await client.query(
        `
          UPDATE courier
          SET is_available = is_online, updated_at = NOW()
          WHERE id = $1
        `,
        [courierId],
      )
    }

    await client.query('COMMIT')
    return { id: deliveryId, status }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listDriverHistory(courierId: number, limit = 365) {
  const result = await pool.query<DriverHistoryRow>(
    `
      SELECT
        delivery.id AS delivery_id,
        delivery.order_id,
        restaurant.name AS restaurant_name,
        NULLIF(CONCAT_WS(', ', address.label, address.street, address.city), '') AS customer_address,
        "order".total,
        delivery.picked_up_at,
        delivery.delivered_at
      FROM delivery
      INNER JOIN "order" ON "order".id = delivery.order_id
      INNER JOIN restaurant ON restaurant.id = "order".restaurant_id
      LEFT JOIN address ON address.id = "order".address_id
      INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
      WHERE delivery.courier_id = $1
        AND delivery_status.name = 'delivered'
        AND delivery.delivered_at IS NOT NULL
      ORDER BY delivery.delivered_at DESC
      LIMIT $2
    `,
    [courierId, Math.max(1, Math.min(limit, 1_000))],
  )

  return result.rows.map(toDriverHistory)
}

export async function listRecentWorkSessions(courierId: number, from: Date) {
  const result = await pool.query<WorkSessionRow>(
    `
      SELECT started_at, ended_at, updated_at
      FROM courier_work_session
      WHERE courier_id = $1
        AND started_at < NOW()
        AND COALESCE(ended_at, NOW()) > $2
      ORDER BY started_at ASC
    `,
    [courierId, from],
  )

  return result.rows
}

export async function listDeliveredTotals(courierId: number, from: Date) {
  const result = await pool.query<DeliveredTotalRow>(
    `
      SELECT delivery.delivered_at, "order".total
      FROM delivery
      INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
      INNER JOIN "order" ON "order".id = delivery.order_id
      WHERE delivery.courier_id = $1
        AND delivery_status.name = 'delivered'
        AND delivery.delivered_at >= $2
      ORDER BY delivery.delivered_at ASC
    `,
    [courierId, from],
  )

  return result.rows.map((row) => ({ deliveredAt: row.delivered_at, total: Number(row.total) }))
}
