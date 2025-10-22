-- Fix foreign key constraint issue for point_transactions
-- Drop the existing constraint and recreate with proper CASCADE behavior

ALTER TABLE point_transactions
DROP CONSTRAINT IF EXISTS coin_transactions_payment_request_id_fkey;

ALTER TABLE point_transactions
DROP CONSTRAINT IF EXISTS point_transactions_payment_request_id_fkey;

-- Recreate the foreign key with ON UPDATE CASCADE to allow updates
ALTER TABLE point_transactions
ADD CONSTRAINT point_transactions_payment_request_id_fkey
FOREIGN KEY (payment_request_id)
REFERENCES payment_requests(id)
ON UPDATE CASCADE
ON DELETE SET NULL;
