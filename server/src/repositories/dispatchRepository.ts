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

export type DispatchAlert = {
  id: number
  orderId: number
  severity: 'warning' | 'critical'
  reason: string
  status: 'open' | 'acknowledged' | 'resolved'
  createdAt: Date
}

export type RecoveredCourierAssignment = {
  orderId: number
  customerUserId: number
  courierId: number
}

export type ExpiredDelivery = {
  orderId: number
  customerUserId: number
  courierUserId: number | null
  status: string
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
        COALESCE("order".delivery_latitude, address.latitude) AS delivery_latitude,
        COALESCE("order".delivery_longitude, address.longitude) AS delivery_longitude,
        restaurant.delivery_radius_km
      FROM "order"
      INNER JOIN order_status ON order_status.id = "order".status_id
        AND order_status.name IN ('accepted', 'preparing', 'ready')
      INNER JOIN restaurant ON restaurant.id = "order".restaurant_id
      LEFT JOIN address ON address.id = "order".address_id
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

export async function getCourierPendingOfferCounts(courierIds: number[]) {
  if (courierIds.length === 0) return new Map<number, number>()

  const result = await pool.query<{ courier_id: string; pending_offers: string }>(
    `
      SELECT courier_id, COUNT(*)::TEXT AS pending_offers
      FROM delivery_dispatch_offer
      WHERE courier_id = ANY($1::BIGINT[])
        AND status = 'pending'
        AND expires_at > NOW()
      GROUP BY courier_id
    `,
    [courierIds],
  )

  return new Map(result.rows.map((row) => [Number(row.courier_id), Number(row.pending_offers)]))
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
        AND courier.last_location_at >= NOW() - INTERVAL '120 seconds'
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
  const result = await pool.query<{ attempts: number }>(
    `
      UPDATE delivery_dispatch_job
      SET status = 'matching', attempts = attempts + 1, last_error = NULL, updated_at = NOW()
      WHERE order_id = $1
      RETURNING attempts
    `,
    [orderId],
  )
  return result.rows[0]?.attempts || 0
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

export async function upsertDispatchAlert(
  orderId: number,
  severity: DispatchAlert['severity'],
  reason: string,
) {
  await pool.query(
    `
      INSERT INTO dispatch_alert (order_id, severity, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (order_id) DO UPDATE
      SET
        severity = EXCLUDED.severity,
        reason = EXCLUDED.reason,
        status = CASE WHEN dispatch_alert.status = 'resolved' THEN 'open' ELSE dispatch_alert.status END,
        updated_at = NOW()
    `,
    [orderId, severity, reason],
  )
}

export async function resolveDispatchAlert(orderId: number) {
  await pool.query(
    `UPDATE dispatch_alert SET status = 'resolved', updated_at = NOW() WHERE order_id = $1 AND status <> 'resolved'`,
    [orderId],
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

/**
 * A browser can be suspended or lose its network connection without the
 * courier explicitly withdrawing.  Assignments that have not reached pickup
 * are safe to put back into dispatch; once food is picked up, only operations
 * staff may intervene.
 */
export async function recoverStaleCourierAssignments(staleAfterSeconds = 120) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const stale = await client.query<{
      delivery_id: string
      order_id: string
      customer_user_id: string
      courier_id: string
    }>(
      `
        SELECT
          delivery.id AS delivery_id,
          delivery.order_id,
          "order".user_id AS customer_user_id,
          delivery.courier_id
        FROM delivery
        INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
        INNER JOIN courier ON courier.id = delivery.courier_id
        INNER JOIN "order" ON "order".id = delivery.order_id
        INNER JOIN order_status ON order_status.id = "order".status_id
        WHERE delivery_status.name IN ('assigned', 'arriving_to_restaurant')
          AND order_status.name IN ('accepted', 'preparing', 'ready')
          AND (
            courier.last_location_at IS NULL
            OR courier.last_location_at < NOW() - ($1 * INTERVAL '1 second')
          )
        ORDER BY courier.last_location_at ASC NULLS FIRST
        LIMIT 50
        FOR UPDATE OF delivery SKIP LOCKED
      `,
      [Math.max(60, Math.min(staleAfterSeconds, 15 * 60))],
    )

    if (stale.rows.length === 0) {
      await client.query('COMMIT')
      return [] satisfies RecoveredCourierAssignment[]
    }

    const recovered: RecoveredCourierAssignment[] = []
    for (const assignment of stale.rows) {
      const reason = 'Courier location stopped updating before pickup; reassignment started automatically.'
      await client.query(
        `
          UPDATE delivery
          SET
            courier_id = NULL,
            status_id = (SELECT id FROM delivery_status WHERE name = 'failed'),
            failed_at = NOW(),
            failure_reason = $2,
            reassign_count = reassign_count + 1,
            updated_at = NOW()
          WHERE id = $1
        `,
        [assignment.delivery_id, reason],
      )
      await client.query(
        `
          INSERT INTO delivery_event (delivery_id, order_id, courier_id, event_type, reason, metadata)
          VALUES ($1, $2, $3, 'driver_withdrew', $4, '{"automaticRecovery": true}'::JSONB)
        `,
        [assignment.delivery_id, assignment.order_id, assignment.courier_id, reason],
      )
      await client.query(
        `UPDATE delivery_dispatch_offer SET status = 'expired', updated_at = NOW() WHERE order_id = $1 AND status = 'pending'`,
        [assignment.order_id],
      )
      await client.query(
        `
          INSERT INTO delivery_dispatch_job (order_id, status, assigned_courier_id, last_error, next_attempt_at)
          VALUES ($1, 'queued', NULL, $2, NOW())
          ON CONFLICT (order_id) DO UPDATE
          SET
            status = 'queued',
            assigned_courier_id = NULL,
            last_error = EXCLUDED.last_error,
            next_attempt_at = NOW(),
            updated_at = NOW()
        `,
        [assignment.order_id, reason],
      )
      recovered.push({
        orderId: Number(assignment.order_id),
        customerUserId: Number(assignment.customer_user_id),
        courierId: Number(assignment.courier_id),
      })
    }

    await client.query('COMMIT')
    return recovered
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function expireOverdueDeliveries(timeoutMinutes: number) {
  const result = await pool.query<{
    order_id: string
    customer_user_id: string
    courier_user_id: string | null
    status: string
  }>(
    `
      WITH overdue AS (
        SELECT delivery.id, delivery.order_id, delivery_status.name AS status
        FROM delivery
        INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
        WHERE delivery_status.name IN ('assigned', 'arriving_to_restaurant', 'picked_up', 'on_the_way')
          AND delivery.updated_at < NOW() - ($1 * INTERVAL '1 minute')
        FOR UPDATE SKIP LOCKED
      ), changed AS (
        UPDATE delivery
        SET status_id = (SELECT id FROM delivery_status WHERE name = 'failed'),
            failed_at = NOW(),
            failure_reason = 'Delivery exceeded the configured time limit.',
            updated_at = NOW()
        FROM overdue
        WHERE delivery.id = overdue.id
        RETURNING delivery.order_id, overdue.status
      )
      , order_changed AS (
        UPDATE "order"
        SET status_id = (SELECT id FROM order_status WHERE name = 'cancelled'), updated_at = NOW()
        FROM changed
        WHERE "order".id = changed.order_id
        RETURNING "order".id AS order_id, "order".user_id
      )
      SELECT order_changed.order_id, order_changed.user_id AS customer_user_id,
             courier.user_id AS courier_user_id, changed.status
      FROM order_changed
      INNER JOIN changed ON changed.order_id = order_changed.order_id
      LEFT JOIN delivery ON delivery.order_id = changed.order_id
      LEFT JOIN courier ON courier.id = delivery.courier_id
    `,
    [Math.max(5, timeoutMinutes)],
  )
  return result.rows.map((row) => ({
    orderId: Number(row.order_id),
    customerUserId: Number(row.customer_user_id),
    courierUserId: row.courier_user_id ? Number(row.courier_user_id) : null,
    status: row.status,
  })) satisfies ExpiredDelivery[]
}
