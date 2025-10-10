-- Add voucher_id column to payment_requests table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_requests' 
    AND column_name = 'voucher_id'
  ) THEN
    ALTER TABLE public.payment_requests ADD COLUMN voucher_id uuid REFERENCES public.vouchers(id);
  END IF;
END $$;