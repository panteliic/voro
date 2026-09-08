import { pool } from '../database/pool'

type RestaurantUserRow = {
  id: string
  restaurant_id: string
  restaurant_name: string
  restaurant_is_active: boolean
  name: string
  email: string
  password: string
  access_role: 'manager' | 'staff'
  is_active: boolean
  email_verified: boolean
}

type RefreshTokenRow = {
  id: string
  token_hash: string
  expires_at: Date
  session_id: string | null
}

type SetupCodeRow = {
  id: string
  code_hash: string
  expires_at: Date
}

function toRestaurantUser(row: RestaurantUserRow) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    restaurantName: row.restaurant_name,
    restaurantIsActive: row.restaurant_is_active,
    name: row.name,
    email: row.email,
    passwordHash: row.password,
    accessRole: row.access_role,
    isActive: row.is_active,
    emailVerified: row.email_verified,
  }
}

const restaurantUserSelect = `
  SELECT
    ru.id,
    ru.restaurant_id,
    r.name AS restaurant_name,
    r.is_active AS restaurant_is_active,
    ru.name,
    ru.email,
    ru.password,
    ru.access_role,
    ru.is_active,
    ru.email_verified
  FROM restaurant_user ru
  INNER JOIN restaurant r ON r.id = ru.restaurant_id
`

export async function findRestaurantUserByEmail(email: string) {
  const result = await pool.query<RestaurantUserRow>(
    `
      ${restaurantUserSelect}
      WHERE LOWER(ru.email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  )

  return result.rows[0] ? toRestaurantUser(result.rows[0]) : null
}

export async function findRestaurantUserById(userId: number) {
  const result = await pool.query<RestaurantUserRow>(
    `
      ${restaurantUserSelect}
      WHERE ru.id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] ? toRestaurantUser(result.rows[0]) : null
}

export async function findPrimaryRestaurantUser(restaurantId: number) {
  const result = await pool.query<RestaurantUserRow>(
    `
      ${restaurantUserSelect}
      WHERE ru.restaurant_id = $1
      ORDER BY CASE WHEN ru.access_role = 'manager' THEN 0 ELSE 1 END, ru.id ASC
      LIMIT 1
    `,
    [restaurantId],
  )

  return result.rows[0] ? toRestaurantUser(result.rows[0]) : null
}

export async function saveSetupCode(payload: {
  restaurantUserId: number
  codeHash: string
  expiresAt: Date
}) {
  await pool.query(
    `
      INSERT INTO restaurant_password_setup_code (restaurant_user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [payload.restaurantUserId, payload.codeHash, payload.expiresAt],
  )
}

export async function findActiveSetupCode(email: string) {
  const result = await pool.query<SetupCodeRow & RestaurantUserRow>(
    `
      SELECT
        setup.id AS id,
        setup.code_hash,
        setup.expires_at,
        ru.restaurant_id,
        r.name AS restaurant_name,
        r.is_active AS restaurant_is_active,
        ru.name,
        ru.email,
        ru.password,
        ru.access_role,
        ru.is_active,
        ru.email_verified
      FROM restaurant_password_setup_code setup
      INNER JOIN restaurant_user ru ON ru.id = setup.restaurant_user_id
      INNER JOIN restaurant r ON r.id = ru.restaurant_id
      WHERE LOWER(ru.email) = LOWER($1)
        AND setup.consumed_at IS NULL
      ORDER BY setup.created_at DESC
      LIMIT 1
    `,
    [email],
  )

  const row = result.rows[0]
  return row
    ? {
        code: {
          id: Number(row.id),
          codeHash: row.code_hash,
          expiresAt: row.expires_at,
        },
        user: toRestaurantUser(row),
      }
    : null
}

export async function consumeSetupCode(codeId: number) {
  await pool.query(
    `UPDATE restaurant_password_setup_code SET consumed_at = NOW() WHERE id = $1`,
    [codeId],
  )
}

export async function recordSetupCodeAttempt(codeId: number) {
  const result = await pool.query<{ attempts: number }>(
    `
      UPDATE restaurant_password_setup_code
      SET attempts = attempts + 1, last_attempt_at = NOW()
      WHERE id = $1 AND consumed_at IS NULL
      RETURNING attempts
    `,
    [codeId],
  )
  return result.rows[0]?.attempts || 0
}

export async function updateRestaurantUserPassword(payload: {
  userId: number
  passwordHash: string
}) {
  await pool.query(
    `
      UPDATE restaurant_user
      SET password = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [payload.userId, payload.passwordHash],
  )
}

export async function saveRefreshToken(payload: {
  restaurantUserId: number
  tokenHash: string
  expiresAt: Date
  sessionId: string
}) {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO restaurant_refresh_token (restaurant_user_id, token_hash, expires_at, session_id)
      VALUES ($1, $2, $3, $4::UUID)
      RETURNING id
    `,
    [payload.restaurantUserId, payload.tokenHash, payload.expiresAt, payload.sessionId],
  )

  return Number(result.rows[0].id)
}

export async function findActiveRefreshTokens(restaurantUserId: number) {
  const result = await pool.query<RefreshTokenRow>(
    `
      SELECT id, token_hash, expires_at, session_id
      FROM restaurant_refresh_token
      WHERE restaurant_user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `,
    [restaurantUserId],
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    sessionId: row.session_id,
  }))
}

export async function revokeRefreshToken(tokenId: number, replacedByTokenId?: number) {
  await pool.query(
    `
      UPDATE restaurant_refresh_token
      SET revoked_at = NOW(), replaced_by_token_id = COALESCE($2, replaced_by_token_id)
      WHERE id = $1 AND revoked_at IS NULL
    `,
    [tokenId, replacedByTokenId || null],
  )
}

export async function revokeAllRefreshTokens(restaurantUserId: number) {
  await pool.query(
    `
      UPDATE restaurant_refresh_token
      SET revoked_at = NOW()
      WHERE restaurant_user_id = $1 AND revoked_at IS NULL
    `,
    [restaurantUserId],
  )
}

export async function revokeRestaurantRefreshTokens(restaurantId: number) {
  await pool.query(
    `
      UPDATE restaurant_refresh_token token
      SET revoked_at = NOW()
      FROM restaurant_user user_account
      WHERE token.restaurant_user_id = user_account.id
        AND user_account.restaurant_id = $1
        AND token.revoked_at IS NULL
    `,
    [restaurantId],
  )
}

export async function isRefreshSessionActive(restaurantUserId: number, sessionId: string) {
  const result = await pool.query(
    `
      SELECT 1
      FROM restaurant_refresh_token
      WHERE restaurant_user_id = $1
        AND session_id = $2::UUID
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [restaurantUserId, sessionId],
  )
  return Boolean(result.rows[0])
}
