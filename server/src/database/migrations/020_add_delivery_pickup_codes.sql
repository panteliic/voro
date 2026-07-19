ALTER TABLE delivery
  ADD COLUMN IF NOT EXISTS pickup_code CHAR(6);

UPDATE delivery
SET pickup_code = LPAD((id % 1000000)::TEXT, 6, '0')
WHERE pickup_code IS NULL;

ALTER TABLE delivery
  ADD CONSTRAINT delivery_pickup_code_format_check
  CHECK (pickup_code IS NULL OR pickup_code ~ '^[0-9]{6}$');
