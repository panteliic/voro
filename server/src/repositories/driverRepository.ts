import { pool } from '../database/pool'
import type { DriverDelivery, DriverProfile } from '../types/driver'

type DriverProfileRow = {
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

type DriverDeliveryRow = {
  id: string
  order_id: string
  status: string
  restaurant_name: string
  customer_name: string
  total: string
  created_at: Date
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDriverDelivery(row: DriverDeliveryRow): DriverDelivery {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    status: row.status,
    restaurantName: row.restaurant_name,
    customerName: row.customer_name,
    total: Number(row.total),
    createdAt: row.created_at,
  }
}

export async function findDriverByUserId(userId: number) {
  const result = await pool.query<DriverProfileRow>(
    `
      SELECT
        courier.*,
        u.name,
        u.email
      FROM courier
      INNER JOIN "user" u ON u.id = courier.user_id
      WHERE courier.user_id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] ? toDriverProfile(result.rows[0]) : null
}

export async function listActiveDeliveries(courierId: number) {
  const result = await pool.query<DriverDeliveryRow>(
    `
      SELECT
        delivery.id,
        delivery.order_id,
        ds.name AS status,
        restaurant.name AS restaurant_name,
        customer.name AS customer_name,
        "order".total,
        delivery.created_at
      FROM delivery
      INNER JOIN delivery_status ds ON ds.id = delivery.status_id
      INNER JOIN "order" ON "order".id = delivery.order_id
      INNER JOIN restaurant ON restaurant.id = "order".restaurant_id
      INNER JOIN "user" customer ON customer.id = "order".user_id
      WHERE delivery.courier_id = $1
        AND ds.name NOT IN ('delivered', 'failed', 'cancelled')
      ORDER BY delivery.created_at DESC
    `,
    [courierId],
  )

  return result.rows.map(toDriverDelivery)
}
