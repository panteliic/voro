DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public."user"') IS NULL THEN
    ALTER TABLE users RENAME TO "user";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE "user" RENAME COLUMN password_hash TO password;
  END IF;
END $$;

DROP INDEX IF EXISTS users_email_lower_unique;

CREATE UNIQUE INDEX IF NOT EXISTS user_email_lower_unique ON "user" (LOWER(email));

CREATE TABLE IF NOT EXISTS role (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO role (id, name)
VALUES
  (1, 'customer'),
  (2, 'restaurant'),
  (3, 'courier'),
  (4, 'admin')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('role', 'id'), COALESCE((SELECT MAX(id) FROM role), 1));

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES role(id);

UPDATE "user"
SET role_id = 1
WHERE role_id IS NULL;

ALTER TABLE "user"
  ALTER COLUMN role_id SET DEFAULT 1,
  ALTER COLUMN role_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS restaurant_category (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurant (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  category_id BIGINT REFERENCES restaurant_category(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS restaurant_owner_user_id_idx ON restaurant (owner_user_id);
CREATE INDEX IF NOT EXISTS restaurant_category_id_idx ON restaurant (category_id);

CREATE TABLE IF NOT EXISTS product_category (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

CREATE INDEX IF NOT EXISTS product_category_restaurant_id_idx ON product_category (restaurant_id);

CREATE TABLE IF NOT EXISTS product (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES product_category(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_restaurant_id_idx ON product (restaurant_id);
CREATE INDEX IF NOT EXISTS product_category_id_idx ON product (category_id);

CREATE TABLE IF NOT EXISTS address (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  label TEXT,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS address_user_id_idx ON address (user_id);

CREATE TABLE IF NOT EXISTS order_status (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO order_status (id, name)
VALUES
  (1, 'pending'),
  (2, 'accepted'),
  (3, 'preparing'),
  (4, 'ready'),
  (5, 'picked_up'),
  (6, 'delivered'),
  (7, 'cancelled')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('order_status', 'id'), COALESCE((SELECT MAX(id) FROM order_status), 1));

CREATE TABLE IF NOT EXISTS "order" (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE RESTRICT,
  address_id BIGINT REFERENCES address(id) ON DELETE SET NULL,
  status_id BIGINT NOT NULL DEFAULT 1 REFERENCES order_status(id),
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_user_id_idx ON "order" (user_id);
CREATE INDEX IF NOT EXISTS order_restaurant_id_idx ON "order" (restaurant_id);
CREATE INDEX IF NOT EXISTS order_status_id_idx ON "order" (status_id);

CREATE TABLE IF NOT EXISTS order_item (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES product(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_item_order_id_idx ON order_item (order_id);
CREATE INDEX IF NOT EXISTS order_item_product_id_idx ON order_item (product_id);

CREATE TABLE IF NOT EXISTS courier (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  phone TEXT,
  vehicle_type TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_status (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO delivery_status (id, name)
VALUES
  (1, 'assigned'),
  (2, 'arriving_to_restaurant'),
  (3, 'picked_up'),
  (4, 'on_the_way'),
  (5, 'delivered'),
  (6, 'failed'),
  (7, 'cancelled')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('delivery_status', 'id'), COALESCE((SELECT MAX(id) FROM delivery_status), 1));

CREATE TABLE IF NOT EXISTS delivery (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES "order"(id) ON DELETE CASCADE,
  courier_id BIGINT REFERENCES courier(id) ON DELETE SET NULL,
  status_id BIGINT NOT NULL DEFAULT 1 REFERENCES delivery_status(id),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_courier_id_idx ON delivery (courier_id);
CREATE INDEX IF NOT EXISTS delivery_status_id_idx ON delivery (status_id);

CREATE TABLE IF NOT EXISTS delivery_location (
  id BIGSERIAL PRIMARY KEY,
  delivery_id BIGINT NOT NULL REFERENCES delivery(id) ON DELETE CASCADE,
  courier_id BIGINT NOT NULL REFERENCES courier(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_location_delivery_id_idx ON delivery_location (delivery_id);
CREATE INDEX IF NOT EXISTS delivery_location_courier_id_idx ON delivery_location (courier_id);

CREATE TABLE IF NOT EXISTS payment (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES "order"(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
