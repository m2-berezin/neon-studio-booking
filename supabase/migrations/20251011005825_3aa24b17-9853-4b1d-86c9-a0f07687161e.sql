-- Add column to track if friend code was used in a payment
ALTER TABLE public.friend_code_uses 
ADD COLUMN IF NOT EXISTS used_in_payment BOOLEAN DEFAULT FALSE;

-- Add column to track the payment request ID
ALTER TABLE public.friend_code_uses 
ADD COLUMN IF NOT EXISTS payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL;