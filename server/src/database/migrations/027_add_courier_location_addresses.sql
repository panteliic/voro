ALTER TABLE courier
  ADD COLUMN IF NOT EXISTS last_location_address TEXT,
  ADD COLUMN IF NOT EXISTS last_location_address_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS last_location_address_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS last_location_address_at TIMESTAMPTZ;
