-- Drop old constraint on payment_requests.type
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_type_check;

-- Update existing rows with invalid type to 'reservation' (safe fallback)
UPDATE public.payment_requests 
SET type = 'reservation' 
WHERE type NOT IN ('reservation', 'subscription_request', 'mixmaster');

-- Add new constraint allowing reservation, subscription_request, and mixmaster
ALTER TABLE public.payment_requests 
ADD CONSTRAINT payment_requests_type_check 
CHECK (type IN ('reservation', 'subscription_request', 'mixmaster'));