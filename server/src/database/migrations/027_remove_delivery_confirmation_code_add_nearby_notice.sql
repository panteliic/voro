-- A delivery is completed by the courier. Customers receive a one-time
-- proximity alert instead of having to provide a handoff code.

ALTER TABLE delivery
  DROP COLUMN IF EXISTS delivery_confirmation_code,
  DROP COLUMN IF EXISTS delivery_code_confirmed_at;

CREATE UNIQUE INDEX IF NOT EXISTS app_notification_courier_nearby_once_idx
  ON app_notification (recipient_user_id, ((data ->> 'orderId')))
  WHERE recipient_user_id IS NOT NULL AND type = 'courier_nearby';
