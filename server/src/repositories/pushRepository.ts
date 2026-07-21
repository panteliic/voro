import { pool } from '../database/pool'

type PushSubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

export async function upsertPushSubscription(
  userId: number,
  payload: { endpoint: string; p256dh: string; auth: string; userAgent: string },
) {
  await pool.query(
    `
      INSERT INTO push_subscription (user_id, endpoint, p256dh, auth, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent,
          updated_at = NOW()
    `,
    [userId, payload.endpoint, payload.p256dh, payload.auth, payload.userAgent || null],
  )
}

export async function listPushSubscriptions(userId: number) {
  const result = await pool.query<PushSubscriptionRow>(
    `SELECT endpoint, p256dh, auth FROM push_subscription WHERE user_id = $1`,
    [userId],
  )
  return result.rows
}

export async function deletePushSubscription(userId: number, endpoint: string) {
  await pool.query(`DELETE FROM push_subscription WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint])
}

export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  await pool.query(`DELETE FROM push_subscription WHERE endpoint = $1`, [endpoint])
}
