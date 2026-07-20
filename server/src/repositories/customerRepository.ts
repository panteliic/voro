import { pool } from '../database/pool'
import { HttpError } from '../utils/httpError'
import type {
  CustomerAddressPayload,
  CreateCustomerOrderPayload,
  CustomerPaymentMethodPayload,
  CustomerPreferencesPayload,
  CustomerProfilePayload,
} from '../types/customer'

type UserProfileRow = {
  id: string
  name: string
  email: string
  phone: string | null
}

type AddressRow = {
  id: string
  user_id: string
  label: string | null
  street: string
  city: string
  postal_code: string | null
  country: string | null
  apartment: string | null
  delivery_instructions: string | null
  latitude: string | null
  longitude: string | null
  is_default: boolean
  created_at: Date
  updated_at: Date
}

type PaymentMethodRow = {
  id: string
  user_id: string
  label: string
  brand: string
  last4: string
  exp_month: number | null
  exp_year: number | null
  is_default: boolean
  created_at: Date
  updated_at: Date
}

type PreferencesRow = {
  user_id: string
  delivery_handoff: string
  courier_notes: string
  allow_substitutions: boolean
  preferred_delivery_window: string
  order_status_notifications: boolean
  courier_message_notifications: boolean
  promotion_notifications: boolean
  receipt_email_notifications: boolean
  two_step_verification: boolean
  personalized_recommendations: boolean
  reduce_motion: boolean
  updated_at: Date
}

type MenuProductRow = {
  id: string
  category_id: string | null
  category_name: string | null
  name: string
  description: string | null
  price: string
  image_url: string | null
  is_available: boolean
}

type CheckoutProductRow = {
  id: string
  name: string
  price: string
}

type CreatedOrderRow = {
  id: string
  subtotal: string
  delivery_fee: string
  total: string
  created_at: Date
}

type CustomerOrderRow = {
  id: string
  restaurant_id: string
  restaurant_name: string
  restaurant_image_url: string | null
  status: string
  driver_name: string | null
  delivery_status: string | null
  subtotal: string
  delivery_fee: string
  total: string
  note: string | null
  address: string | null
  created_at: Date
  updated_at: Date
  items: Array<{
    productId: number
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }> | null
}

type CustomerOrderRouteRow = {
  restaurant_name: string
  restaurant_latitude: string | null
  restaurant_longitude: string | null
  delivery_address: string | null
  delivery_latitude: string | null
  delivery_longitude: string | null
  courier_name: string | null
  courier_id: string | null
  courier_latitude: string | null
  courier_longitude: string | null
  delivery_status: string | null
}

function toUserProfile(row: UserProfileRow) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone || '',
  }
}

function toAddress(row: AddressRow) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    label: row.label || '',
    street: row.street,
    city: row.city,
    postalCode: row.postal_code || '',
    country: row.country || '',
    apartment: row.apartment || '',
    deliveryInstructions: row.delivery_instructions || '',
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPaymentMethod(row: PaymentMethodRow) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    label: row.label,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPreferences(row: PreferencesRow) {
  return {
    userId: Number(row.user_id),
    deliveryHandoff: row.delivery_handoff,
    courierNotes: row.courier_notes,
    allowSubstitutions: row.allow_substitutions,
    preferredDeliveryWindow: row.preferred_delivery_window,
    orderStatusNotifications: row.order_status_notifications,
    courierMessageNotifications: row.courier_message_notifications,
    promotionNotifications: row.promotion_notifications,
    receiptEmailNotifications: row.receipt_email_notifications,
    twoStepVerification: row.two_step_verification,
    personalizedRecommendations: row.personalized_recommendations,
    reduceMotion: row.reduce_motion,
    updatedAt: row.updated_at,
  }
}

function toMenuProduct(row: MenuProductRow) {
  return {
    id: Number(row.id),
    categoryId: row.category_id ? Number(row.category_id) : null,
    categoryName: row.category_name || '',
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    imageUrl: row.image_url || '',
    isAvailable: row.is_available,
  }
}

function toCustomerOrder(row: CustomerOrderRow) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    restaurantName: row.restaurant_name,
    restaurantImageUrl: row.restaurant_image_url || '',
    status: row.status,
    driverName: row.driver_name || '',
    deliveryStatus: row.delivery_status || '',
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    note: row.note || '',
    address: row.address || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: Array.isArray(row.items)
      ? row.items.map((item) => ({
          productId: Number(item.productId),
          name: item.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }))
      : [],
  }
}

export async function getUserProfile(userId: number) {
  const result = await pool.query<UserProfileRow>(
    'SELECT id, name, email, phone FROM "user" WHERE id = $1',
    [userId],
  )

  return result.rows[0] ? toUserProfile(result.rows[0]) : null
}

export async function updateUserProfile(userId: number, payload: CustomerProfilePayload) {
  const result = await pool.query<UserProfileRow>(
    `
      UPDATE "user"
      SET name = $2, phone = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, phone
    `,
    [userId, payload.name, payload.phone || null],
  )

  return result.rows[0] ? toUserProfile(result.rows[0]) : null
}

export async function ensurePreferences(userId: number) {
  const result = await pool.query<PreferencesRow>(
    `
      INSERT INTO customer_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING *
    `,
    [userId],
  )

  return toPreferences(result.rows[0])
}

export async function updatePreferences(userId: number, payload: CustomerPreferencesPayload) {
  const result = await pool.query<PreferencesRow>(
    `
      INSERT INTO customer_preferences (
        user_id,
        delivery_handoff,
        courier_notes,
        allow_substitutions,
        preferred_delivery_window,
        order_status_notifications,
        courier_message_notifications,
        promotion_notifications,
        receipt_email_notifications,
        two_step_verification,
        personalized_recommendations,
        reduce_motion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        delivery_handoff = EXCLUDED.delivery_handoff,
        courier_notes = EXCLUDED.courier_notes,
        allow_substitutions = EXCLUDED.allow_substitutions,
        preferred_delivery_window = EXCLUDED.preferred_delivery_window,
        order_status_notifications = EXCLUDED.order_status_notifications,
        courier_message_notifications = EXCLUDED.courier_message_notifications,
        promotion_notifications = EXCLUDED.promotion_notifications,
        receipt_email_notifications = EXCLUDED.receipt_email_notifications,
        two_step_verification = EXCLUDED.two_step_verification,
        personalized_recommendations = EXCLUDED.personalized_recommendations,
        reduce_motion = EXCLUDED.reduce_motion,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      payload.deliveryHandoff,
      payload.courierNotes,
      payload.allowSubstitutions,
      payload.preferredDeliveryWindow,
      payload.orderStatusNotifications,
      payload.courierMessageNotifications,
      payload.promotionNotifications,
      payload.receiptEmailNotifications,
      payload.twoStepVerification,
      payload.personalizedRecommendations,
      payload.reduceMotion,
    ],
  )

  return toPreferences(result.rows[0])
}

export async function listAddresses(userId: number) {
  const result = await pool.query<AddressRow>(
    'SELECT * FROM address WHERE user_id = $1 ORDER BY is_default DESC, updated_at DESC',
    [userId],
  )

  return result.rows.map(toAddress)
}

export async function createAddress(userId: number, payload: CustomerAddressPayload) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT 1 FROM address WHERE user_id = $1 LIMIT 1', [userId])
    const shouldSetDefault = (existing.rowCount ?? 0) === 0

    if (shouldSetDefault) {
      await client.query('UPDATE address SET is_default = FALSE WHERE user_id = $1', [userId])
    }

    const result = await client.query<AddressRow>(
      `
        INSERT INTO address (
          user_id,
          label,
          street,
          city,
          postal_code,
          country,
          apartment,
          delivery_instructions,
          latitude,
          longitude,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        userId,
        payload.label || null,
        payload.street,
        payload.city,
        payload.postalCode || null,
        payload.country || null,
        payload.apartment || null,
        payload.deliveryInstructions || null,
        payload.latitude,
        payload.longitude,
        shouldSetDefault,
      ],
    )

    await client.query('COMMIT')
    return toAddress(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateAddress(
  userId: number,
  addressId: number,
  payload: CustomerAddressPayload,
) {
  const result = await pool.query<AddressRow>(
    `
      UPDATE address
      SET
        label = $3,
        street = $4,
        city = $5,
        postal_code = $6,
        country = $7,
        apartment = $8,
        delivery_instructions = $9,
        latitude = $10,
        longitude = $11,
        updated_at = NOW()
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `,
    [
      userId,
      addressId,
      payload.label || null,
      payload.street,
      payload.city,
      payload.postalCode || null,
      payload.country || null,
      payload.apartment || null,
      payload.deliveryInstructions || null,
      payload.latitude,
      payload.longitude,
    ],
  )

  return result.rows[0] ? toAddress(result.rows[0]) : null
}

export async function setDefaultAddress(userId: number, addressId: number) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const found = await client.query('SELECT 1 FROM address WHERE user_id = $1 AND id = $2', [
      userId,
      addressId,
    ])

    if ((found.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK')
      return null
    }

    await client.query('UPDATE address SET is_default = FALSE WHERE user_id = $1', [userId])
    const result = await client.query<AddressRow>(
      'UPDATE address SET is_default = TRUE, updated_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, addressId],
    )
    await client.query('COMMIT')
    return toAddress(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteAddress(userId: number, addressId: number) {
  const result = await pool.query<AddressRow>(
    'DELETE FROM address WHERE user_id = $1 AND id = $2 RETURNING *',
    [userId, addressId],
  )

  return result.rows[0] ? toAddress(result.rows[0]) : null
}

export async function listPaymentMethods(userId: number) {
  const result = await pool.query<PaymentMethodRow>(
    'SELECT * FROM payment_method WHERE user_id = $1 ORDER BY is_default DESC, updated_at DESC',
    [userId],
  )

  return result.rows.map(toPaymentMethod)
}

export async function createPaymentMethod(userId: number, payload: CustomerPaymentMethodPayload) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT 1 FROM payment_method WHERE user_id = $1 LIMIT 1', [
      userId,
    ])
    const shouldSetDefault = (existing.rowCount ?? 0) === 0

    if (shouldSetDefault) {
      await client.query('UPDATE payment_method SET is_default = FALSE WHERE user_id = $1', [userId])
    }

    const result = await client.query<PaymentMethodRow>(
      `
        INSERT INTO payment_method (
          user_id,
          label,
          brand,
          last4,
          encrypted_card_number,
          exp_month,
          exp_year,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        userId,
        payload.label,
        payload.brand,
        payload.last4,
        payload.encryptedCardNumber || null,
        payload.expMonth,
        payload.expYear,
        shouldSetDefault,
      ],
    )

    await client.query('COMMIT')
    return toPaymentMethod(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updatePaymentMethod(
  userId: number,
  paymentMethodId: number,
  payload: CustomerPaymentMethodPayload,
) {
  const result = await pool.query<PaymentMethodRow>(
    `
      UPDATE payment_method
      SET
        label = $3,
        brand = $4,
        last4 = $5,
        exp_month = $6,
        exp_year = $7,
        encrypted_card_number = COALESCE($8, encrypted_card_number),
        updated_at = NOW()
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `,
    [
      userId,
      paymentMethodId,
      payload.label,
      payload.brand,
      payload.last4,
      payload.expMonth,
      payload.expYear,
      payload.encryptedCardNumber || null,
    ],
  )

  return result.rows[0] ? toPaymentMethod(result.rows[0]) : null
}

export async function setDefaultPaymentMethod(userId: number, paymentMethodId: number) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const found = await client.query('SELECT 1 FROM payment_method WHERE user_id = $1 AND id = $2', [
      userId,
      paymentMethodId,
    ])

    if ((found.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK')
      return null
    }

    await client.query('UPDATE payment_method SET is_default = FALSE WHERE user_id = $1', [userId])
    const result = await client.query<PaymentMethodRow>(
      'UPDATE payment_method SET is_default = TRUE, updated_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, paymentMethodId],
    )
    await client.query('COMMIT')
    return toPaymentMethod(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deletePaymentMethod(userId: number, paymentMethodId: number) {
  const result = await pool.query<PaymentMethodRow>(
    'DELETE FROM payment_method WHERE user_id = $1 AND id = $2 RETURNING *',
    [userId, paymentMethodId],
  )

  return result.rows[0] ? toPaymentMethod(result.rows[0]) : null
}

export async function listAvailableProducts(restaurantId: number) {
  const result = await pool.query<MenuProductRow>(
    `
      SELECT
        product.id,
        product.category_id,
        product_category.name AS category_name,
        product.name,
        product.description,
        product.price,
        product.image_url,
        product.is_available
      FROM product
      LEFT JOIN product_category ON product_category.id = product.category_id
      WHERE product.restaurant_id = $1
        AND product.is_available = TRUE
      ORDER BY product_category.name ASC NULLS LAST, product.created_at ASC, product.id ASC
    `,
    [restaurantId],
  )

  return result.rows.map(toMenuProduct)
}

export async function listCustomerOrders(userId: number, limit = 50) {
  const result = await pool.query<CustomerOrderRow>(
    `
      SELECT
        o.id,
        o.restaurant_id,
        restaurant.name AS restaurant_name,
        restaurant.image_url AS restaurant_image_url,
        status.name AS status,
        driver.name AS driver_name,
        delivery_status.name AS delivery_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.note,
        NULLIF(CONCAT_WS(', ', address.label, address.street, address.city), '') AS address,
        o.created_at,
        o.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'productId', order_item.product_id,
              'name', order_item.product_name,
              'quantity', order_item.quantity,
              'unitPrice', order_item.unit_price,
              'totalPrice', order_item.total_price
            )
            ORDER BY order_item.id ASC
          ) FILTER (WHERE order_item.id IS NOT NULL),
          '[]'::JSON
        ) AS items
      FROM "order" o
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      INNER JOIN order_status status ON status.id = o.status_id
      LEFT JOIN address ON address.id = o.address_id
      LEFT JOIN delivery ON delivery.order_id = o.id
      LEFT JOIN delivery_status ON delivery_status.id = delivery.status_id
      LEFT JOIN courier ON courier.id = delivery.courier_id
      LEFT JOIN "user" driver ON driver.id = courier.user_id
      LEFT JOIN order_item ON order_item.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY
        o.id,
        restaurant.id,
        restaurant.name,
        restaurant.image_url,
        status.name,
        driver.name,
        delivery_status.name,
        address.label,
        address.street,
        address.city
      ORDER BY o.created_at DESC
      LIMIT $2
    `,
    [userId, Math.max(1, Math.min(limit, 100))],
  )

  return result.rows.map(toCustomerOrder)
}

export async function getCustomerOrderRouteLocations(userId: number, orderId: number) {
  const result = await pool.query<CustomerOrderRouteRow>(
    `
      SELECT
        restaurant.name AS restaurant_name,
        restaurant.latitude AS restaurant_latitude,
        restaurant.longitude AS restaurant_longitude,
        NULLIF(CONCAT_WS(', ', address.label, address.street, address.city), '') AS delivery_address,
        address.latitude AS delivery_latitude,
        address.longitude AS delivery_longitude,
        driver.name AS courier_name,
        courier.id AS courier_id,
        courier.current_latitude AS courier_latitude,
        courier.current_longitude AS courier_longitude,
        delivery_status.name AS delivery_status
      FROM "order" o
      INNER JOIN restaurant ON restaurant.id = o.restaurant_id
      LEFT JOIN address ON address.id = o.address_id
      LEFT JOIN delivery ON delivery.order_id = o.id
      LEFT JOIN delivery_status ON delivery_status.id = delivery.status_id
      LEFT JOIN courier ON courier.id = delivery.courier_id
      LEFT JOIN "user" driver ON driver.id = courier.user_id
      WHERE o.user_id = $1 AND o.id = $2
    `,
    [userId, orderId],
  )

  const row = result.rows[0]

  if (!row) {
    return null
  }

  return {
    restaurantName: row.restaurant_name,
    restaurantLatitude: row.restaurant_latitude === null ? null : Number(row.restaurant_latitude),
    restaurantLongitude: row.restaurant_longitude === null ? null : Number(row.restaurant_longitude),
    deliveryAddress: row.delivery_address || '',
    deliveryLatitude: row.delivery_latitude === null ? null : Number(row.delivery_latitude),
    deliveryLongitude: row.delivery_longitude === null ? null : Number(row.delivery_longitude),
    courierName: row.courier_name || '',
    courierId: row.courier_id === null ? null : Number(row.courier_id),
    courierLatitude: row.courier_latitude === null ? null : Number(row.courier_latitude),
    courierLongitude: row.courier_longitude === null ? null : Number(row.courier_longitude),
    deliveryStatus: row.delivery_status || '',
  }
}

export async function createCustomerOrder(
  userId: number,
  payload: CreateCustomerOrderPayload,
  deliveryFee: number,
) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const productIds = payload.items.map((item) => item.productId)
    const productResult = await client.query<CheckoutProductRow>(
      `
        SELECT id, name, price
        FROM product
        WHERE restaurant_id = $1
          AND is_available = TRUE
          AND id = ANY($2::BIGINT[])
        FOR UPDATE
      `,
      [payload.restaurantId, productIds],
    )

    if (productResult.rows.length !== productIds.length) {
      await client.query('ROLLBACK')
      return null
    }

    const productsById = new Map(productResult.rows.map((product) => [Number(product.id), product]))
    const items = payload.items.map((item) => {
      const product = productsById.get(item.productId)

      if (!product) {
        throw new Error('Selected product is unavailable.')
      }

      const unitPrice = Number(product.price)
      return {
        ...item,
        name: product.name,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      }
    })
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
    const total = subtotal + deliveryFee

    if (payload.paymentMethod === 'cash' && (payload.cashTendered === null || payload.cashTendered < total)) {
      throw new HttpError(400, 'Cash amount must cover the full order total.')
    }

    const changeDue = payload.paymentMethod === 'cash'
      ? Number(((payload.cashTendered || 0) - total).toFixed(2))
      : 0
    const orderResult = await client.query<CreatedOrderRow>(
      `
        INSERT INTO "order" (user_id, restaurant_id, address_id, subtotal, delivery_fee, total, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, subtotal, delivery_fee, total, created_at
      `,
      [
        userId,
        payload.restaurantId,
        payload.addressId,
        subtotal,
        deliveryFee,
        total,
        payload.note || null,
      ],
    )
    const order = orderResult.rows[0]

    await client.query(
      `
        INSERT INTO payment (order_id, amount, method, status, cash_tendered, change_due)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        order.id,
        total,
        payload.paymentMethod,
        payload.paymentMethod === 'cash' ? 'pending_cash' : 'mock_authorized',
        payload.cashTendered,
        changeDue,
      ],
    )

    for (const item of items) {
      await client.query(
        `
          INSERT INTO order_item (order_id, product_id, product_name, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [order.id, item.productId, item.name, item.quantity, item.unitPrice, item.totalPrice],
      )
    }

    await client.query('COMMIT')

    return {
      id: Number(order.id),
      status: 'pending',
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      total: Number(order.total),
      paymentMethod: payload.paymentMethod,
      cashTendered: payload.cashTendered,
      changeDue,
      createdAt: order.created_at,
      items: items.map(({ name, productId, quantity, totalPrice, unitPrice }) => ({
        productId,
        name,
        quantity,
        unitPrice,
        totalPrice,
      })),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
