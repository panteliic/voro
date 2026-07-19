-- Restaurant operators are a separate identity domain. They are not platform users
-- and can only operate the restaurant linked to their account.
CREATE TABLE IF NOT EXISTS restaurant_user (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  access_role TEXT NOT NULL DEFAULT 'manager' CHECK (access_role IN ('manager', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_user_email_lower_unique
  ON restaurant_user (LOWER(email));

CREATE INDEX IF NOT EXISTS restaurant_user_restaurant_id_idx
  ON restaurant_user (restaurant_id);

CREATE TABLE IF NOT EXISTS restaurant_password_setup_code (
  id BIGSERIAL PRIMARY KEY,
  restaurant_user_id BIGINT NOT NULL REFERENCES restaurant_user(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS restaurant_password_setup_code_active_idx
  ON restaurant_password_setup_code (restaurant_user_id, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS restaurant_refresh_token (
  id BIGSERIAL PRIMARY KEY,
  restaurant_user_id BIGINT NOT NULL REFERENCES restaurant_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id BIGINT REFERENCES restaurant_refresh_token(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS restaurant_refresh_token_active_idx
  ON restaurant_refresh_token (restaurant_user_id, expires_at)
  WHERE revoked_at IS NULL;

-- Preserve access for existing demo restaurants, then remove their legacy platform accounts.
CREATE TEMP TABLE migrated_restaurant_account AS
SELECT
  restaurant.owner_user_id AS legacy_user_id,
  restaurant.id AS restaurant_id
FROM restaurant
WHERE restaurant.owner_user_id IS NOT NULL;

INSERT INTO restaurant_user (
  restaurant_id,
  name,
  email,
  password,
  access_role,
  is_active,
  email_verified,
  created_at,
  updated_at
)
SELECT
  restaurant.id,
  COALESCE(NULLIF(restaurant.name, ''), legacy_user.name),
  COALESCE(NULLIF(restaurant.email, ''), legacy_user.email),
  legacy_user.password,
  'manager',
  restaurant.is_active AND legacy_user.is_active,
  TRUE,
  legacy_user.created_at,
  NOW()
FROM restaurant
INNER JOIN "user" legacy_user ON legacy_user.id = restaurant.owner_user_id
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS restaurant_owner_user_id_idx;
ALTER TABLE restaurant DROP CONSTRAINT IF EXISTS restaurant_owner_user_id_fkey;
ALTER TABLE restaurant DROP COLUMN IF EXISTS owner_user_id;

DELETE FROM "user" legacy_user
USING migrated_restaurant_account migrated
WHERE legacy_user.id = migrated.legacy_user_id;
