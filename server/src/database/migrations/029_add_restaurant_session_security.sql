-- Restaurant access tokens now bind to a rotating server-side session. Existing
-- refresh tokens are deliberately revoked so an old access token cannot retain
-- access after this hardening migration.
ALTER TABLE restaurant_refresh_token
  ADD COLUMN IF NOT EXISTS session_id UUID;

UPDATE restaurant_refresh_token
SET revoked_at = NOW()
WHERE session_id IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS restaurant_refresh_token_active_session_idx
  ON restaurant_refresh_token (restaurant_user_id, session_id, expires_at)
  WHERE revoked_at IS NULL AND session_id IS NOT NULL;

ALTER TABLE restaurant_password_setup_code
  ADD COLUMN IF NOT EXISTS attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
