-- Make reservation_id nullable for subscription payments
ALTER TABLE public.payment_requests 
ALTER COLUMN reservation_id DROP NOT NULL;