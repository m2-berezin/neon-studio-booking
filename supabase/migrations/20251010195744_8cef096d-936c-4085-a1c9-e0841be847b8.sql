-- Remove all old triggers and functions
DROP TRIGGER IF EXISTS apply_voucher_discount_trigger ON public.payment_requests;
DROP TRIGGER IF EXISTS trg_apply_voucher_discount ON public.payment_requests;
DROP FUNCTION IF EXISTS public.apply_voucher_discount() CASCADE;
DROP FUNCTION IF EXISTS public.apply_voucher_to_payment() CASCADE;

-- Create the new correct function using the vouchers table
CREATE FUNCTION public.apply_voucher_to_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_voucher_id uuid;
  v_voucher_amount numeric;
BEGIN
  -- Find the most recent unused voucher for this user
  -- A voucher is considered "used" if there's an approved payment_request created after it
  SELECT v.id, v.amount_eur INTO v_voucher_id, v_voucher_amount
  FROM public.vouchers v
  WHERE v.client_id = NEW.user_id 
    AND v.expires_at > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.user_id = v.client_id
        AND pr.created_at > v.created_at
        AND pr.status = 'approved'
    )
  ORDER BY v.created_at DESC
  LIMIT 1;
  
  -- Apply discount if voucher found
  IF v_voucher_id IS NOT NULL THEN
    NEW.amount_eur := GREATEST(0, NEW.amount_eur - v_voucher_amount);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payment_requests
CREATE TRIGGER apply_voucher_discount_trigger
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_voucher_to_payment();