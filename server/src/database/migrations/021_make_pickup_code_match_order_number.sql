-- The restaurant pickup code mirrors the order number, so both sides have one clear reference.
UPDATE delivery
SET pickup_code = LPAD((order_id % 1000000)::TEXT, 6, '0')
WHERE pickup_code IS DISTINCT FROM LPAD((order_id % 1000000)::TEXT, 6, '0');
