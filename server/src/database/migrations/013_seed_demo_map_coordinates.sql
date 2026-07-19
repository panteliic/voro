-- Demo coordinates keep every test route inside Belgrade until restaurants provide their own location.
-- Executed only through `npm run seed:demo`.

WITH restaurant_positions AS (
  SELECT
    restaurant.id,
    44.7820000 + ((ROW_NUMBER() OVER (ORDER BY restaurant.name) - 1) / 8) * 0.0100000
      + ((ROW_NUMBER() OVER (ORDER BY restaurant.name) - 1) % 4) * 0.0013000 AS latitude,
    20.4040000 + ((ROW_NUMBER() OVER (ORDER BY restaurant.name) - 1) % 8) * 0.0120000 AS longitude
  FROM restaurant
)
UPDATE restaurant
SET latitude = restaurant_positions.latitude,
    longitude = restaurant_positions.longitude,
    updated_at = NOW()
FROM restaurant_positions
WHERE restaurant.id = restaurant_positions.id
  AND (restaurant.latitude IS NULL OR restaurant.longitude IS NULL);

WITH customer_positions AS (
  SELECT
    address.id,
    44.7980000 + ((ROW_NUMBER() OVER (ORDER BY customer.email) - 1) / 5) * 0.0060000 AS latitude,
    20.4240000 + ((ROW_NUMBER() OVER (ORDER BY customer.email) - 1) % 5) * 0.0100000 AS longitude
  FROM address
  INNER JOIN "user" customer ON customer.id = address.user_id
  WHERE customer.email LIKE 'customer.%@seed.voro.test'
)
UPDATE address
SET latitude = customer_positions.latitude,
    longitude = customer_positions.longitude,
    updated_at = NOW()
FROM customer_positions
WHERE address.id = customer_positions.id
  AND (address.latitude IS NULL OR address.longitude IS NULL);

-- Keep the customer and restaurant used in the walkthrough close enough for a clear demo route.
UPDATE restaurant
SET latitude = 44.8126000,
    longitude = 20.4269000,
    updated_at = NOW()
WHERE email = 'restaurant.domace-palacinke@voro.test';

UPDATE address
SET latitude = 44.8185000,
    longitude = 20.4554000,
    updated_at = NOW()
WHERE id IN (
  SELECT address.id
  FROM address
  INNER JOIN "user" customer ON customer.id = address.user_id
  WHERE customer.email = 'customer.ana@seed.voro.test'
    AND address.label = 'Kuća'
);
