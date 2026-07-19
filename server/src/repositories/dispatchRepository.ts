import { pool } from '../database/pool'

export type DispatchOrder = {
  id: number
  restaurantLatitude: number
  restaurantLongitude: number
  deliveryLatitude: number
  deliveryLongitude: number
}

export type DispatchCandidate = {
  id: number
  name: string
  vehicleType: string
  latitude: number
  longitude: number
}

type DispatchOrderRow = {
  id: string
  restaurant_latitude: string | null
  restaurant_longitude: string | null
  delivery_latitude: string | null
  delivery_longitude: string | null
}

type DispatchCandidateRow = {
  id: string
  name: string
  vehicle_type: string | null
  current_latitude: string
  current_longitude: string
}

export async function queueDispatch(orderId: number) {
  await pool.query(
    `
      INSERT INTO delivery_dispatch_job (order_id, status)
      VALUES ($1, 'queued')
      ON CONFLICT (order_id) DO UPDATE
      SET
        status = CASE
          WHEN delivery_dispatch_job.status IN ('waiting_for_driver', 'failed') THEN 'queued'
          ELSE delivery_dispatch_job.status
        END,
        next_attempt_at = CASE
          WHEN delivery_dispatch_job.status IN ('waiting_for_driver', 'failed') THEN NOW()
          ELSE delivery_dispatch_job.next_attempt_at
        END,
        updated_at = NOW()
    `,
    [orderId],
  )
}

export async function getPreparingOrderForDispatch(orderId: number) {
  const result = await pool.query<DispatchOrderRow>(
    `
      SELECT
        o.id,
        restaurant.latitude AS restaurant_latitude,
        restaurant.longitude AS restaurant_longitude,
        address.latitude AS delivery_latitude,
        address.longitude AS delivery_longitude
      FROM "order" o
      INNER JOIN order_status status ON status.id = o.status_id AND status.name = 'preparing'
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      INNER JOIN address ON address.id = o.address_id
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  )
  const order = result.rows[0]

  if (
    !order ||
    order.restaurant_latitude === null ||
    order.restaurant_longitude === null ||
    order.delivery_latitude === null ||
    order.delivery_longitude === null
  ) {
    return null
  }

  return {
    id: Number(order.id),
    restaurantLatitude: Number(order.restaurant_latitude),
    restaurantLongitude: Number(order.restaurant_longitude),
    deliveryLatitude: Number(order.delivery_latitude),
    deliveryLongitude: Number(order.delivery_longitude),
  } satisfies DispatchOrder
}

export async function listAvailableOnlineCouriers() {
  const result = await pool.query<DispatchCandidateRow>(
    `
      SELECT courier.id, "user".name, courier.vehicle_type, courier.current_latitude, courier.current_longitude
      FROM courier
      INNER JOIN "user" ON "user".id = courier.user_id
      WHERE courier.is_online = TRUE
        AND courier.is_available = TRUE
        AND courier.current_latitude IS NOT NULL
        AND courier.current_longitude IS NOT NULL
      ORDER BY courier.last_location_at DESC NULLS LAST, courier.id ASC
    `,
  )

  return result.rows.map((courier) => ({
    id: Number(courier.id),
    name: courier.name,
    vehicleType: courier.vehicle_type || '',
    latitude: Number(courier.current_latitude),
    longitude: Number(courier.current_longitude),
  })) satisfies DispatchCandidate[]
}

export async function markDispatchMatching(orderId: number) {
  await pool.query(
    `
      UPDATE delivery_dispatch_job
      SET status = 'matching', attempts = attempts + 1, last_error = NULL, updated_at = NOW()
      WHERE order_id = $1
    `,
    [orderId],
  )
}

export async function markDispatchWaiting(orderId: number, reason: string, retryAfterMs: number) {
  await pool.query(
    `
      UPDATE delivery_dispatch_job
      SET
        status = 'waiting_for_driver',
        last_error = $2,
        next_attempt_at = NOW() + ($3 * INTERVAL '1 millisecond'),
        updated_at = NOW()
      WHERE order_id = $1
    `,
    [orderId, reason, retryAfterMs],
  )
}

export async function markDispatchAssigned(orderId: number, courierId: number) {
  await pool.query(
    `
      UPDATE delivery_dispatch_job
      SET
        status = 'assigned',
        assigned_courier_id = $2,
        last_error = NULL,
        next_attempt_at = NOW(),
        updated_at = NOW()
      WHERE order_id = $1
    `,
    [orderId, courierId],
  )
}

export async function markDispatchFailed(orderId: number, reason: string) {
  await pool.query(
    `
      UPDATE delivery_dispatch_job
      SET status = 'failed', last_error = $2, updated_at = NOW()
      WHERE order_id = $1
    `,
    [orderId, reason],
  )
}

export async function listPendingDispatchOrderIds() {
  const result = await pool.query<{ order_id: string }>(
    `
      SELECT order_id
      FROM delivery_dispatch_job
      WHERE status IN ('queued', 'matching')
        OR (status = 'waiting_for_driver' AND next_attempt_at <= NOW())
      ORDER BY next_attempt_at ASC, updated_at ASC
    `,
  )

  return result.rows.map((row) => Number(row.order_id))
}

export async function assignCourierToOrder(orderId: number, courierId: number) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existingDelivery = await client.query<{ id: string; courier_id: string | null }>(
      'SELECT id, courier_id FROM delivery WHERE order_id = $1 FOR UPDATE',
      [orderId],
    )

    if (existingDelivery.rows[0]) {
      await client.query('COMMIT')
      return {
        deliveryId: Number(existingDelivery.rows[0].id),
        courierId: existingDelivery.rows[0].courier_id ? Number(existingDelivery.rows[0].courier_id) : null,
        assigned: false,
      }
    }

    const courier = await client.query<{
      id: string
      current_latitude: string | null
      current_longitude: string | null
    }>(
      `
        SELECT id, current_latitude, current_longitude
        FROM courier
        WHERE id = $1 AND is_online = TRUE AND is_available = TRUE
        FOR UPDATE
      `,
      [courierId],
    )

    const selectedCourier = courier.rows[0]

    if (!selectedCourier) {
      await client.query('ROLLBACK')
      return null
    }

    const delivery = await client.query<{ id: string }>(
      `
        INSERT INTO delivery (order_id, courier_id, status_id)
        VALUES ($1, $2, (SELECT id FROM delivery_status WHERE name = 'assigned'))
        RETURNING id
      `,
      [orderId, courierId],
    )

    await client.query(
      'UPDATE courier SET is_available = FALSE, updated_at = NOW() WHERE id = $1',
      [courierId],
    )

    if (selectedCourier.current_latitude !== null && selectedCourier.current_longitude !== null) {
      await client.query(
        `
          INSERT INTO delivery_location (delivery_id, courier_id, latitude, longitude)
          VALUES ($1, $2, $3, $4)
        `,
        [
          delivery.rows[0].id,
          courierId,
          Number(selectedCourier.current_latitude),
          Number(selectedCourier.current_longitude),
        ],
      )
    }

    await client.query('COMMIT')

    return { deliveryId: Number(delivery.rows[0].id), courierId, assigned: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
