ALTER TABLE email_verification_codes
  ADD COLUMN IF NOT EXISTS attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

ALTER TABLE password_reset_code
  ADD COLUMN IF NOT EXISTS attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

ALTER TABLE delivery
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS reassign_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS delivery_event (
  id BIGSERIAL PRIMARY KEY,
  delivery_id BIGINT NOT NULL REFERENCES delivery(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  courier_id BIGINT REFERENCES courier(id) ON DELETE SET NULL,
  actor_user_id BIGINT REFERENCES "user"(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('assigned', 'picked_up', 'on_the_way', 'delivered', 'driver_withdrew', 'reassigned')),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_event_order_idx ON delivery_event (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS delivery_event_delivery_idx ON delivery_event (delivery_id, created_at ASC);

CREATE TABLE IF NOT EXISTS push_subscription (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscription_user_idx ON push_subscription (user_id, updated_at DESC);
