-- Delivery proof, restaurant preparation controls, dispatch escalation, and
-- privacy-friendly retention support. These fields are additive so existing
-- demo deliveries continue to work during rollout.

ALTER TABLE delivery
  ADD COLUMN IF NOT EXISTS delivery_confirmation_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_code_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_proof_note TEXT,
  ADD COLUMN IF NOT EXISTS delivery_proof_photo_url TEXT;

ALTER TABLE restaurant
  ADD COLUMN IF NOT EXISTS preparation_minutes SMALLINT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS busy_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_accept_orders BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE restaurant
  DROP CONSTRAINT IF EXISTS restaurant_preparation_minutes_check;

ALTER TABLE restaurant
  ADD CONSTRAINT restaurant_preparation_minutes_check
  CHECK (preparation_minutes BETWEEN 5 AND 180);

CREATE TABLE IF NOT EXISTS dispatch_alert (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES "order"(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by_user_id BIGINT REFERENCES "user"(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dispatch_alert_open_idx
  ON dispatch_alert (status, severity, created_at ASC)
  WHERE status <> 'resolved';

CREATE INDEX IF NOT EXISTS delivery_location_retention_idx
  ON delivery_location (recorded_at ASC);
