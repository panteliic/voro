ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE address
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS apartment TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

CREATE TABLE IF NOT EXISTS customer_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  delivery_handoff TEXT NOT NULL DEFAULT 'leave_at_door',
  courier_notes TEXT NOT NULL DEFAULT '',
  allow_substitutions BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_delivery_window TEXT NOT NULL DEFAULT 'asap',
  order_status_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  courier_message_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  promotion_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  two_step_verification BOOLEAN NOT NULL DEFAULT FALSE,
  personalized_recommendations BOOLEAN NOT NULL DEFAULT TRUE,
  reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_method (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  encrypted_card_number TEXT,
  exp_month INTEGER CHECK (exp_month BETWEEN 1 AND 12),
  exp_year INTEGER CHECK (exp_year >= 2024),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_method_user_id_idx ON payment_method (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_method_single_default_idx
  ON payment_method (user_id)
  WHERE is_default = TRUE;
