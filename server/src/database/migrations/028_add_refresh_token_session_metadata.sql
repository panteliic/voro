-- Device-aware session management. Refresh-token rotation keeps one active
-- row per signed-in device, while access tokens reference the same session.

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS device_label TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

UPDATE refresh_tokens
SET last_used_at = COALESCE(last_used_at, created_at)
WHERE last_used_at IS NULL;

CREATE INDEX IF NOT EXISTS refresh_tokens_active_session_idx
  ON refresh_tokens (user_id, session_id, expires_at)
  WHERE revoked_at IS NULL AND session_id IS NOT NULL;
