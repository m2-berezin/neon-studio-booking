-- Fix payment_requests_type_check constraint to include 'subscription'
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_type_check;

-- Add new constraint allowing all valid types
ALTER TABLE public.payment_requests 
ADD CONSTRAINT payment_requests_type_check 
CHECK (type IN ('reservation', 'subscription_request', 'subscription', 'mixmaster'));