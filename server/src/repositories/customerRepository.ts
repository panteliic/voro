import { pool } from '../database/pool'
import type {
  CustomerAddressPayload,
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
