ALTER TABLE payment
  ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS change_due NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE payment
  ADD CONSTRAINT payment_cash_tendered_nonnegative_check
  CHECK (cash_tendered IS NULL OR cash_tendered >= 0);
