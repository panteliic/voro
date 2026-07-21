import { pool } from "../database/pool";
import type { User } from "../types/auth";

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  role_id: string;
  role_name: "customer" | "restaurant" | "courier" | "admin";
  is_active: boolean;
  email_verified: boolean;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function toUser(row: UserRow): User {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    passwordHash: row.password,
    roleId: Number(row.role_id),
    roleName: row.role_name,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByEmail(email: string) {
  const result = await pool.query<UserRow>(
    `
      SELECT u.*, r.name AS role_name
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
      WHERE LOWER(u.email) = LOWER($1)
    `,
    [email],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function findUserById(userId: number) {
  const result = await pool.query<UserRow>(
    `
      SELECT u.*, r.name AS role_name
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
      WHERE u.id = $1
    `,
    [userId],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function createUser(payload: {
  name: string;
  email: string;
  passwordHash: string;
  roleId?: number;
}) {
  const result = await pool.query<UserRow>(
    `
      INSERT INTO "user" (name, email, password, role_id)
      VALUES ($1, $2, $3, COALESCE($4, 1))
      RETURNING *,
        (SELECT name FROM role WHERE id = "user".role_id) AS role_name
    `,
    [payload.name, payload.email, payload.passwordHash, payload.roleId ?? null],
  );

  return toUser(result.rows[0]);
}

export async function createVerifiedUser(payload: {
  name: string;
  email: string;
  passwordHash: string;
  roleId: number;
}) {
  const result = await pool.query<UserRow>(
    `
      INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      RETURNING *,
        (SELECT name FROM role WHERE id = "user".role_id) AS role_name
    `,
    [payload.name, payload.email, payload.passwordHash, payload.roleId],
  );

  return toUser(result.rows[0]);
}

export async function countUsersByRole(roleName: string) {
  const result = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*) AS count
      FROM "user" u
      INNER JOIN role r ON r.id = u.role_id
      WHERE r.name = $1
    `,
    [roleName],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function updateUnverifiedUser(payload: {
  userId: number;
  name: string;
  passwordHash: string;
}) {
  const result = await pool.query<UserRow>(
    `
      UPDATE "user"
      SET name = $2, password = $3, updated_at = NOW()
      WHERE id = $1 AND email_verified = FALSE
      RETURNING *,
        (SELECT name FROM role WHERE id = "user".role_id) AS role_name
    `,
    [payload.userId, payload.name, payload.passwordHash],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function saveVerificationCode(payload: {
  userId: number;
  codeHash: string;
  expiresAt: Date;
}) {
  await pool.query(
    "UPDATE email_verification_codes SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL",
    [payload.userId],
  );

  await pool.query(
    `
      INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [payload.userId, payload.codeHash, payload.expiresAt],
  );
}

export async function findActiveVerificationCode(email: string) {
  const result = await pool.query<{
    id: string;
    user_id: string;
    code_hash: string;
    expires_at: Date;
    attempts: number;
  }>(
    `
      SELECT evc.id, evc.user_id, evc.code_hash, evc.expires_at, evc.attempts
      FROM email_verification_codes evc
      INNER JOIN "user" u ON u.id = evc.user_id
      WHERE LOWER(u.email) = LOWER($1)
        AND evc.consumed_at IS NULL
      ORDER BY evc.created_at DESC
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    attempts: row.attempts,
  };
}

export async function consumeVerificationCode(codeId: number) {
  await pool.query(
    "UPDATE email_verification_codes SET consumed_at = NOW() WHERE id = $1",
    [codeId],
  );
}

export async function recordVerificationCodeAttempt(codeId: number) {
  const result = await pool.query<{ attempts: number }>(
    `
      UPDATE email_verification_codes
      SET attempts = attempts + 1, last_attempt_at = NOW()
      WHERE id = $1 AND consumed_at IS NULL
      RETURNING attempts
    `,
    [codeId],
  )
  return result.rows[0]?.attempts || 0
}

export async function verifyUserEmail(userId: number) {
  const result = await pool.query<UserRow>(
    `
      UPDATE "user"
      SET email_verified = TRUE, verified_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *,
        (SELECT name FROM role WHERE id = "user".role_id) AS role_name
    `,
    [userId],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function updateUserPassword(payload: {
  userId: number;
  passwordHash: string;
}) {
  const result = await pool.query<UserRow>(
    `
      UPDATE "user"
      SET password = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *,
        (SELECT name FROM role WHERE id = "user".role_id) AS role_name
    `,
    [payload.userId, payload.passwordHash],
  );

  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function savePasswordResetCode(payload: {
  userId: number;
  codeHash: string;
  expiresAt: Date;
}) {
  await pool.query(
    "UPDATE password_reset_code SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL",
    [payload.userId],
  );

  await pool.query(
    `
      INSERT INTO password_reset_code (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [payload.userId, payload.codeHash, payload.expiresAt],
  );
}

export async function findActivePasswordResetCode(email: string) {
  const result = await pool.query<{
    id: string;
    user_id: string;
    code_hash: string;
    expires_at: Date;
    attempts: number;
  }>(
    `
      SELECT prc.id, prc.user_id, prc.code_hash, prc.expires_at, prc.attempts
      FROM password_reset_code prc
      INNER JOIN "user" u ON u.id = prc.user_id
      WHERE LOWER(u.email) = LOWER($1)
        AND prc.consumed_at IS NULL
      ORDER BY prc.created_at DESC
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    attempts: row.attempts,
  };
}

export async function consumePasswordResetCode(codeId: number) {
  await pool.query(
    "UPDATE password_reset_code SET consumed_at = NOW() WHERE id = $1",
    [codeId],
  );
}

export async function recordPasswordResetCodeAttempt(codeId: number) {
  const result = await pool.query<{ attempts: number }>(
    `
      UPDATE password_reset_code
      SET attempts = attempts + 1, last_attempt_at = NOW()
      WHERE id = $1 AND consumed_at IS NULL
      RETURNING attempts
    `,
    [codeId],
  )
  return result.rows[0]?.attempts || 0
}

export async function saveRefreshToken(payload: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [payload.userId, payload.tokenHash, payload.expiresAt],
  );

  return Number(result.rows[0].id);
}

export async function findActiveRefreshTokens(userId: number) {
  const result = await pool.query<{
    id: string;
    token_hash: string;
    expires_at: Date;
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
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
  }));
}

export async function revokeRefreshToken(
  tokenId: number,
  replacedByTokenId?: number,
) {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW(), replaced_by_token_id = COALESCE($2, replaced_by_token_id)
      WHERE id = $1 AND revoked_at IS NULL
    `,
    [tokenId, replacedByTokenId ?? null],
  );
}

export async function revokeAllUserRefreshTokens(userId: number) {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId],
  );
}
