ALTER TABLE courier
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;

ALTER TABLE courier
  ADD CONSTRAINT courier_current_location_pair_check
  CHECK (
    (current_latitude IS NULL AND current_longitude IS NULL)
    OR (current_latitude IS NOT NULL AND current_longitude IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS courier_dispatch_candidates_idx
  ON courier (is_online, is_available)
  WHERE is_online = TRUE AND is_available = TRUE;

CREATE TABLE IF NOT EXISTS delivery_dispatch_job (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES "order"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'matching', 'assigned', 'waiting_for_driver', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  assigned_courier_id BIGINT REFERENCES courier(id) ON DELETE SET NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_dispatch_job_status_idx
  ON delivery_dispatch_job (status, updated_at);
