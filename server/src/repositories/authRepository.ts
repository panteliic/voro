import { pool } from '../database/pool'
import type { User } from '../types/auth'

type UserRow = {
  id: string
  name: string
  email: string
  password: string
  email_verified: boolean
  verified_at: Date | null
  created_at: Date
  updated_at: Date
}

function toUser(row: UserRow): User {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    passwordHash: row.password,
    emailVerified: row.email_verified,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findUserByEmail(email: string) {
  const result = await pool.query<UserRow>('SELECT * FROM "user" WHERE LOWER(email) = LOWER($1)', [
    email,
  ])

  return result.rows[0] ? toUser(result.rows[0]) : null
}

export async function findUserById(userId: number) {
  const result = await pool.query<UserRow>('SELECT * FROM "user" WHERE id = $1', [userId])

  return result.rows[0] ? toUser(result.rows[0]) : null
}

export async function createUser(payload: {
  name: string
  email: string
  passwordHash: string
}) {
  const result = await pool.query<UserRow>(
    `
      INSERT INTO "user" (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [payload.name, payload.email, payload.passwordHash],
  )

  return toUser(result.rows[0])
}

export async function updateUnverifiedUser(payload: {
  userId: number
  name: string
  passwordHash: string
}) {
  const result = await pool.query<UserRow>(
    `
      UPDATE "user"
      SET name = $2, password = $3, updated_at = NOW()
      WHERE id = $1 AND email_verified = FALSE
      RETURNING *
    `,
    [payload.userId, payload.name, payload.passwordHash],
  )

  return result.rows[0] ? toUser(result.rows[0]) : null
}

export async function saveVerificationCode(payload: {
  userId: number
  codeHash: string
  expiresAt: Date
}) {
  await pool.query('UPDATE email_verification_codes SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL', [
    payload.userId,
  ])

  await pool.query(
    `
      INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [payload.userId, payload.codeHash, payload.expiresAt],
  )
}

export async function findActiveVerificationCode(email: string) {
  const result = await pool.query<{
    id: string
    user_id: string
    code_hash: string
    expires_at: Date
  }>(
    `
      SELECT evc.id, evc.user_id, evc.code_hash, evc.expires_at
      FROM email_verification_codes evc
      INNER JOIN "user" u ON u.id = evc.user_id
      WHERE LOWER(u.email) = LOWER($1)
        AND evc.consumed_at IS NULL
      ORDER BY evc.created_at DESC
      LIMIT 1
    `,
    [email],
  )

  const row = result.rows[0]

  if (!row) {
    return null
  }

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
  }
}

export async function consumeVerificationCode(codeId: number) {
  await pool.query('UPDATE email_verification_codes SET consumed_at = NOW() WHERE id = $1', [codeId])
}

export async function verifyUserEmail(userId: number) {
  const result = await pool.query<UserRow>(
    `
      UPDATE "user"
      SET email_verified = TRUE, verified_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [userId],
  )

  return result.rows[0] ? toUser(result.rows[0]) : null
}

export async function saveRefreshToken(payload: {
  userId: number
  tokenHash: string
  expiresAt: Date
}) {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [payload.userId, payload.tokenHash, payload.expiresAt],
  )

  return Number(result.rows[0].id)
}

export async function findActiveRefreshTokens(userId: number) {
  const result = await pool.query<{
    id: string
    token_hash: string
    expires_at: Date
  }>(
    `
      SELECT id, token_hash, expires_at
      FROM refresh_tokens
      WHERE user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `,
    [userId],
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
  }))
}

export async function revokeRefreshToken(tokenId: number, replacedByTokenId?: number) {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW(), replaced_by_token_id = COALESCE($2, replaced_by_token_id)
      WHERE id = $1 AND revoked_at IS NULL
    `,
    [tokenId, replacedByTokenId ?? null],
  )
}

export async function revokeAllUserRefreshTokens(userId: number) {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId],
  )
}
