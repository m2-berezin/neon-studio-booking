-- Add voucher_id column to payment_requests table if it doesn't exist
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS voucher_id uuid REFERENCES public.vouchers(id);