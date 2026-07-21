-- Operational delivery features that do not depend on an external payment provider.

ALTER TABLE restaurant
  ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB NOT NULL DEFAULT '{"mon":{"enabled":true,"open":"00:00","close":"23:59"},"tue":{"enabled":true,"open":"00:00","close":"23:59"},"wed":{"enabled":true,"open":"00:00","close":"23:59"},"thu":{"enabled":true,"open":"00:00","close":"23:59"},"fri":{"enabled":true,"open":"00:00","close":"23:59"},"sat":{"enabled":true,"open":"00:00","close":"23:59"},"sun":{"enabled":true,"open":"00:00","close":"23:59"}}'::JSONB,
  ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE restaurant
  DROP CONSTRAINT IF EXISTS restaurant_delivery_radius_km_check;

ALTER TABLE restaurant
  ADD CONSTRAINT restaurant_delivery_radius_km_check
  CHECK (delivery_radius_km > 0 AND delivery_radius_km <= 50);

ALTER TABLE "order"
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE TABLE IF NOT EXISTS restaurant_favorite (
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS order_review (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES "order"(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_review_restaurant_id_idx ON order_review (restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_issue (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  reporter_user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('late_delivery', 'missing_item', 'wrong_item', 'quality', 'courier', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  resolution_note TEXT,
  resolved_by_user_id BIGINT REFERENCES "user"(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_issue_status_idx ON order_issue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_issue_order_id_idx ON order_issue (order_id);

CREATE TABLE IF NOT EXISTS order_message (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'courier')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_message_order_id_idx ON order_message (order_id, created_at ASC);

CREATE TABLE IF NOT EXISTS app_notification (
  id BIGSERIAL PRIMARY KEY,
  recipient_user_id BIGINT REFERENCES "user"(id) ON DELETE CASCADE,
  restaurant_id BIGINT REFERENCES restaurant(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (recipient_user_id IS NOT NULL AND restaurant_id IS NULL)
    OR (recipient_user_id IS NULL AND restaurant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS app_notification_user_idx
  ON app_notification (recipient_user_id, read_at, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_notification_restaurant_idx
  ON app_notification (restaurant_id, read_at, created_at DESC)
  WHERE restaurant_id IS NOT NULL;
