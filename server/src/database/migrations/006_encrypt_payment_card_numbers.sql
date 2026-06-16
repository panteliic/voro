ALTER TABLE payment_method
  ADD COLUMN IF NOT EXISTS encrypted_card_number TEXT;
