CREATE TABLE IF NOT EXISTS password_reset_code (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_code_user_id_idx
  ON password_reset_code (user_id);

CREATE INDEX IF NOT EXISTS password_reset_code_active_idx
  ON password_reset_code (user_id, expires_at)
  WHERE consumed_at IS NULL;
