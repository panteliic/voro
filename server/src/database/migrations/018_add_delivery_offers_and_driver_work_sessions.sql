CREATE TABLE IF NOT EXISTS courier_work_session (
  id BIGSERIAL PRIMARY KEY,
  courier_id BIGINT NOT NULL REFERENCES courier(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS courier_work_session_open_idx
  ON courier_work_session (courier_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS courier_work_session_period_idx
  ON courier_work_session (courier_id, started_at DESC);

CREATE TABLE IF NOT EXISTS delivery_dispatch_offer (
  id BIGSERIAL PRIMARY KEY,
  dispatch_job_id BIGINT NOT NULL REFERENCES delivery_dispatch_job(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  courier_id BIGINT NOT NULL REFERENCES courier(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, courier_id)
);

CREATE INDEX IF NOT EXISTS delivery_dispatch_offer_courier_pending_idx
  ON delivery_dispatch_offer (courier_id, expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS delivery_dispatch_offer_order_pending_idx
  ON delivery_dispatch_offer (order_id, expires_at)
  WHERE status = 'pending';
