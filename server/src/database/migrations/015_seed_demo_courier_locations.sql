-- Deterministic test locations for couriers currently working in Belgrade.
-- Executed only through `npm run seed:demo`.

WITH courier_positions AS (
  SELECT
    courier.id,
    courier.is_available,
    44.7900000 + ((ROW_NUMBER() OVER (ORDER BY "user".email) - 1) / 6) * 0.0065000
      + ((ROW_NUMBER() OVER (ORDER BY "user".email) - 1) % 3) * 0.0014000 AS latitude,
    20.4080000 + ((ROW_NUMBER() OVER (ORDER BY "user".email) - 1) % 6) * 0.0105000 AS longitude
  FROM courier
  INNER JOIN "user" ON "user".id = courier.user_id
  WHERE "user".email LIKE '%@driver.voro.test'
)
UPDATE courier
SET is_online = courier_positions.is_available,
    current_latitude = courier_positions.latitude,
    current_longitude = courier_positions.longitude,
    last_location_at = NOW(),
    updated_at = NOW()
FROM courier_positions
WHERE courier.id = courier_positions.id;

-- A nearby online courier makes the Domaće palačinke dispatch walkthrough deterministic.
UPDATE courier
SET is_online = TRUE,
    is_available = TRUE,
    current_latitude = 44.8144000,
    current_longitude = 20.4399000,
    last_location_at = NOW(),
    updated_at = NOW()
WHERE user_id = (
  SELECT id
  FROM "user"
  WHERE email = 'marko.jovanovic@driver.voro.test'
);
