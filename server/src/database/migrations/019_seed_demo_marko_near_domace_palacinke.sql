-- Local demo setup for testing dispatch to Marko Jovanović.
-- Executed only through `npm run seed:demo`.

-- A historical demo delivery must not leave the test courier busy.
WITH marko AS (
  SELECT courier.id AS courier_id
  FROM courier
  INNER JOIN "user" ON "user".id = courier.user_id
  WHERE "user".email = 'marko.jovanovic@driver.voro.test'
), cancelled_demo_deliveries AS (
  UPDATE delivery
  SET status_id = (SELECT id FROM delivery_status WHERE name = 'cancelled'),
      updated_at = NOW()
  FROM "order", marko
  WHERE delivery.courier_id = marko.courier_id
    AND delivery.order_id = "order".id
    AND "order".note LIKE 'Demo seed Belgrade 2026 order %'
    AND delivery.status_id IN (
      SELECT id
      FROM delivery_status
      WHERE name IN ('assigned', 'arriving_to_restaurant', 'picked_up', 'on_the_way')
    )
  RETURNING delivery.order_id
)
UPDATE "order"
SET status_id = (SELECT id FROM order_status WHERE name = 'cancelled'),
    updated_at = NOW()
WHERE id IN (SELECT order_id FROM cancelled_demo_deliveries);

-- Domaće palačinke: 44.8126000, 20.4269000.
-- Marko is placed roughly one kilometre away, online, free, and with a fresh GPS timestamp.
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
