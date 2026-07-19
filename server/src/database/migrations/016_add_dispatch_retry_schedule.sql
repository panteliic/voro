ALTER TABLE delivery_dispatch_job
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS delivery_dispatch_job_pending_idx
  ON delivery_dispatch_job (status, next_attempt_at)
  WHERE status IN ('queued', 'matching', 'waiting_for_driver');
