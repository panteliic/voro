-- A network retry must never create a second order. The request fingerprint
-- also prevents accidentally reusing a key for a different checkout.
CREATE TABLE IF NOT EXISTS checkout_idempotency (
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  order_id BIGINT REFERENCES "order"(id) ON DELETE SET NULL,
  order_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, idempotency_key),
  CHECK (char_length(idempotency_key) BETWEEN 16 AND 128)
);

CREATE INDEX IF NOT EXISTS checkout_idempotency_created_at_idx
  ON checkout_idempotency (created_at);
