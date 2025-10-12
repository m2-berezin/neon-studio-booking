-- Add 'loyalty_mixmaster' type to payment_requests type constraint
ALTER TABLE public.payment_requests
DROP CONSTRAINT IF EXISTS payment_requests_type_check;

ALTER TABLE public.payment_requests
ADD CONSTRAINT payment_requests_type_check
CHECK (type IN ('reservation', 'subscription', 'subscription_request', 'mixmaster', 'loyalty_mixmaster'));