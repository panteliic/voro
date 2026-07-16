-- Restaurant profiles authenticate through the user table, but are shown as restaurant accounts.
-- Executed only through `npm run seed:demo`.

UPDATE "user" restaurant_account
SET
  name = restaurant.name,
  email = REGEXP_REPLACE(
    restaurant_account.email,
    '^owner\.(.+)@seed\.voro\.test$',
    'restaurant.\1@voro.test'
  ),
  updated_at = NOW()
FROM restaurant
WHERE restaurant.owner_user_id = restaurant_account.id
  AND restaurant_account.email LIKE 'owner.%@seed.voro.test';

UPDATE restaurant
SET email = restaurant_account.email,
    updated_at = NOW()
FROM "user" restaurant_account
WHERE restaurant_account.id = restaurant.owner_user_id
  AND restaurant_account.email LIKE 'restaurant.%@voro.test';
