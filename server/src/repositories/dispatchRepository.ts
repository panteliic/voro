import { pool } from '../database/pool'

export type DispatchOrder = {
  id: number
  restaurantLatitude: number
  restaurantLongitude: number
  deliveryLatitude: number
  deliveryLongitude: number
  deliveryRadiusKm: number
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
  delivery_radius_km: string | null
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
        "order".id,
        restaurant.latitude AS restaurant_latitude,
        restaurant.longitude AS restaurant_longitude,
        address.latitude AS delivery_latitude,
        address.longitude AS delivery_longitude,
        restaurant.delivery_radius_km
      FROM "order"
      INNER JOIN order_status ON order_status.id = "order".status_id
        AND order_status.name IN ('accepted', 'preparing', 'ready')
      INNER JOIN restaurant ON restaurant.id = "order".restaurant_id
      INNER JOIN address ON address.id = "order".address_id
      LEFT JOIN delivery ON delivery.order_id = "order".id
      LEFT JOIN delivery_status existing_delivery_status ON existing_delivery_status.id = delivery.status_id
      WHERE "order".id = $1
        AND (delivery.id IS NULL OR existing_delivery_status.name IN ('failed', 'cancelled'))
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
    deliveryRadiusKm: Number(order.delivery_radius_km || 8),
  } satisfies DispatchOrder
}

export async function getCourierActiveLoads(courierIds: number[]) {
  if (courierIds.length === 0) return new Map<number, number>()
  const result = await pool.query<{ courier_id: string; active_deliveries: string }>(
    `
      SELECT delivery.courier_id, COUNT(*)::TEXT AS active_deliveries
      FROM delivery
      INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
      WHERE delivery.courier_id = ANY($1::BIGINT[])
        AND delivery_status.name NOT IN ('delivered', 'failed', 'cancelled')
      GROUP BY delivery.courier_id
    `,
    [courierIds],
  )
  return new Map(result.rows.map((row) => [Number(row.courier_id), Number(row.active_deliveries)]))
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
        AND courier.last_location_at >= NOW() - INTERVAL '45 seconds'
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

export async function createDispatchOffers(orderId: number, courierIds: number[], expiresInMs: number) {
  if (courierIds.length === 0) {
    return 0
  }

  const result = await pool.query<{ courier_id: string }>(
    `
      INSERT INTO delivery_dispatch_offer (
        dispatch_job_id,
        order_id,
        courier_id,
        status,
        expires_at
      )
      SELECT
        job.id,
        job.order_id,
        offered_courier.id,
        'pending',
        NOW() + ($3 * INTERVAL '1 millisecond')
      FROM delivery_dispatch_job job
      INNER JOIN UNNEST($2::BIGINT[]) AS offered_courier(id) ON TRUE
      WHERE job.order_id = $1
      ON CONFLICT (order_id, courier_id) DO UPDATE
      SET
        dispatch_job_id = EXCLUDED.dispatch_job_id,
        status = 'pending',
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      WHERE delivery_dispatch_offer.status NOT IN ('declined', 'accepted')
      RETURNING courier_id
    `,
    [orderId, courierIds, expiresInMs],
  )

  return result.rows.length
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
