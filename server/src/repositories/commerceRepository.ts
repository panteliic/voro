import type { PoolClient } from 'pg'
import { pool } from '../database/pool'
import { HttpError } from '../utils/httpError'

type PromotionRow = {
  id: string
  restaurant_id: string | null
  code: string
  discount_type: 'fixed' | 'percentage'
  discount_value: string
  minimum_order: string
  max_redemptions: number | null
  redemptions: number
  description?: string
  starts_at?: Date | null
  ends_at?: Date | null
  is_active?: boolean
  created_at?: Date
}

export type ManagedPromotion = {
  id: number
  restaurantId: number | null
  code: string
  description: string
  discountType: 'fixed' | 'percentage'
  discountValue: number
  minimumOrder: number
  maxRedemptions: number | null
  redemptions: number
  startsAt: Date | null
  endsAt: Date | null
  isActive: boolean
  createdAt: Date
}

export type CheckoutDiscount = {
  amount: number
  promotionId: number | null
  promotionCode: string | null
  referralCode: string | null
  referrerUserId: number | null
}

function normalizedCode(value: string) {
  return value.trim().toUpperCase()
}

function toManagedPromotion(row: PromotionRow): ManagedPromotion {
  return {
    id: Number(row.id),
    restaurantId: row.restaurant_id === null ? null : Number(row.restaurant_id),
    code: row.code,
    description: row.description || '',
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minimumOrder: Number(row.minimum_order),
    maxRedemptions: row.max_redemptions,
    redemptions: row.redemptions,
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    isActive: row.is_active ?? true,
    createdAt: row.created_at || new Date(),
  }
}

export async function listPromotions() {
  const result = await pool.query<PromotionRow>(
    `
      SELECT id, restaurant_id, code, description, discount_type, discount_value, minimum_order,
             max_redemptions, redemptions, starts_at, ends_at, is_active, created_at
      FROM promotion_code
      ORDER BY created_at DESC
    `,
  )
  return result.rows.map(toManagedPromotion)
}

export async function createPromotion(input: {
  restaurantId: number | null
  code: string
  description: string
  discountType: 'fixed' | 'percentage'
  discountValue: number
  minimumOrder: number
  maxRedemptions: number | null
  startsAt: Date | null
  endsAt: Date | null
}) {
  const result = await pool.query<PromotionRow>(
    `
      INSERT INTO promotion_code (
        restaurant_id, code, description, discount_type, discount_value, minimum_order,
        max_redemptions, starts_at, ends_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, restaurant_id, code, description, discount_type, discount_value, minimum_order,
                max_redemptions, redemptions, starts_at, ends_at, is_active, created_at
    `,
    [
      input.restaurantId,
      normalizedCode(input.code),
      input.description,
      input.discountType,
      input.discountValue,
      input.minimumOrder,
      input.maxRedemptions,
      input.startsAt,
      input.endsAt,
    ],
  )
  return toManagedPromotion(result.rows[0])
}

export async function ensureReferralCode(userId: number) {
  const code = `VORO-${userId.toString(36).toUpperCase()}`
  const result = await pool.query<{ code: string }>(
    `
      INSERT INTO referral_code (user_id, code)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET code = referral_code.code
      RETURNING code
    `,
    [userId, code],
  )

  return result.rows[0].code
}

export async function getReferralSummary(userId: number) {
  const code = await ensureReferralCode(userId)
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::TEXT AS count FROM referral_redemption WHERE referrer_user_id = $1',
    [userId],
  )

  return { code, completedReferrals: Number(result.rows[0]?.count || 0) }
}

export async function resolveCheckoutDiscount(
  client: PoolClient,
  input: {
    userId: number
    restaurantId: number
    subtotal: number
    promotionCode: string
    referralCode: string
  },
): Promise<CheckoutDiscount> {
  const promotionCode = normalizedCode(input.promotionCode)
  const referralCode = normalizedCode(input.referralCode)

  if (promotionCode) {
    const result = await client.query<PromotionRow>(
      `
        SELECT id, restaurant_id, code, discount_type, discount_value, minimum_order, max_redemptions, redemptions
        FROM promotion_code
        WHERE code = $1
          AND is_active = TRUE
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at > NOW())
        FOR UPDATE
      `,
      [promotionCode],
    )
    const promotion = result.rows[0]

    if (!promotion || (promotion.restaurant_id !== null && Number(promotion.restaurant_id) !== input.restaurantId)) {
      throw new HttpError(400, 'This promo code is not available for the selected restaurant.')
    }
    if (input.subtotal < Number(promotion.minimum_order)) {
      throw new HttpError(400, `This promo code requires a minimum order of ${Number(promotion.minimum_order)} RSD.`)
    }
    if (promotion.max_redemptions !== null && promotion.redemptions >= promotion.max_redemptions) {
      throw new HttpError(409, 'This promo code has reached its redemption limit.')
    }
    const existing = await client.query('SELECT 1 FROM promotion_redemption WHERE promotion_code_id = $1 AND user_id = $2', [promotion.id, input.userId])
    if (existing.rowCount) throw new HttpError(409, 'This promo code was already used on this account.')

    const rawAmount = promotion.discount_type === 'percentage'
      ? input.subtotal * (Number(promotion.discount_value) / 100)
      : Number(promotion.discount_value)
    return {
      amount: Math.min(input.subtotal, Math.round(rawAmount * 100) / 100),
      promotionId: Number(promotion.id),
      promotionCode: promotion.code,
      referralCode: null,
      referrerUserId: null,
    }
  }

  if (!referralCode) {
    return { amount: 0, promotionId: null, promotionCode: null, referralCode: null, referrerUserId: null }
  }

  const result = await client.query<{ user_id: string; code: string }>(
    'SELECT user_id, code FROM referral_code WHERE code = $1 FOR UPDATE',
    [referralCode],
  )
  const referral = result.rows[0]
  if (!referral || Number(referral.user_id) === input.userId) {
    throw new HttpError(400, 'Enter a valid referral code from another customer.')
  }
  const priorOrders = await client.query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM "order" WHERE user_id = $1', [input.userId])
  const existingReferral = await client.query('SELECT 1 FROM referral_redemption WHERE referred_user_id = $1', [input.userId])
  if (Number(priorOrders.rows[0]?.count || 0) > 0 || existingReferral.rowCount) {
    throw new HttpError(409, 'A referral discount is available only on a first order.')
  }

  return {
    amount: Math.min(input.subtotal, Math.round(Math.min(input.subtotal * 0.1, 500) * 100) / 100),
    promotionId: null,
    promotionCode: null,
    referralCode: referral.code,
    referrerUserId: Number(referral.user_id),
  }
}

export async function recordCheckoutDiscount(
  client: PoolClient,
  input: CheckoutDiscount & { userId: number; orderId: number },
) {
  if (input.promotionId) {
    await client.query(
      'INSERT INTO promotion_redemption (promotion_code_id, user_id, order_id, discount_amount) VALUES ($1, $2, $3, $4)',
      [input.promotionId, input.userId, input.orderId, input.amount],
    )
    await client.query('UPDATE promotion_code SET redemptions = redemptions + 1, updated_at = NOW() WHERE id = $1', [input.promotionId])
  }
  if (input.referrerUserId && input.referralCode) {
    await client.query(
      'INSERT INTO referral_redemption (referrer_user_id, referred_user_id, order_id, referral_code, discount_amount) VALUES ($1, $2, $3, $4, $5)',
      [input.referrerUserId, input.userId, input.orderId, input.referralCode, input.amount],
    )
  }
}

export async function createSupportTicket(userId: number, payload: { category: string; subject: string; body: string; orderId: number | null }) {
  const result = await pool.query<{ id: string; status: string; created_at: Date }>(
    `
      INSERT INTO support_ticket (user_id, order_id, category, subject, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, status, created_at
    `,
    [userId, payload.orderId, payload.category, payload.subject, payload.body],
  )
  const ticket = result.rows[0]
  return { id: Number(ticket.id), status: ticket.status, createdAt: ticket.created_at }
}
