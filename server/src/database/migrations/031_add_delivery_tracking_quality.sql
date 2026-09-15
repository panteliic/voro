-- Keep the source GPS observation separately from the position exposed to the
-- tracking map.  The old latitude/longitude columns remain the immutable raw
-- audit trail, while display_* is the quality-filtered point used by customers.
ALTER TABLE delivery_location
  ADD COLUMN IF NOT EXISTS display_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS display_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS heading_degrees NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS speed_mps NUMERIC(8, 3),
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_usable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE delivery_location
  DROP CONSTRAINT IF EXISTS delivery_location_display_pair_check;

ALTER TABLE delivery_location
  ADD CONSTRAINT delivery_location_display_pair_check
  CHECK (
    (display_latitude IS NULL AND display_longitude IS NULL)
    OR (display_latitude IS NOT NULL AND display_longitude IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS delivery_location_tracking_latest_idx
  ON delivery_location (delivery_id, recorded_at DESC)
  WHERE is_usable = TRUE;
