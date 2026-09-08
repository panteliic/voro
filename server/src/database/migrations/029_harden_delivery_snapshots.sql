-- An order must retain the delivery destination selected at checkout. Customer
-- addresses are editable profile data and must never alter an in-flight job.
ALTER TABLE "order"
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10, 7);

-- Preserve the best available destination for historical orders during the
-- rollout. New checkouts always write these fields directly.
UPDATE "order" o
SET
  delivery_address = COALESCE(
    o.delivery_address,
    NULLIF(CONCAT_WS(', ', address.label, address.street, address.apartment, address.postal_code, address.city, address.country), '')
  ),
  delivery_instructions = COALESCE(o.delivery_instructions, address.delivery_instructions),
  delivery_latitude = COALESCE(o.delivery_latitude, address.latitude),
  delivery_longitude = COALESCE(o.delivery_longitude, address.longitude)
FROM address
WHERE address.id = o.address_id
  AND (
    o.delivery_address IS NULL
    OR o.delivery_latitude IS NULL
    OR o.delivery_longitude IS NULL
  );

CREATE INDEX IF NOT EXISTS order_delivery_coordinates_idx
  ON "order" (delivery_latitude, delivery_longitude)
  WHERE delivery_latitude IS NOT NULL AND delivery_longitude IS NOT NULL;
