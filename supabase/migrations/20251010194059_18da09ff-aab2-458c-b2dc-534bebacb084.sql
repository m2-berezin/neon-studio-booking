-- Create trigger to automatically apply voucher discount on payment_request creation
CREATE OR REPLACE FUNCTION public.apply_voucher_to_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_voucher record;
BEGIN
  -- Check if user has unused voucher
  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE client_id = NEW.user_id 
    AND expires_at > NOW()
    AND id NOT IN (
      SELECT DISTINCT unnest(ARRAY(
        SELECT id FROM vouchers v
        WHERE EXISTS (
          SELECT 1 FROM payment_requests pr
          WHERE pr.user_id = v.client_id
            AND pr.created_at > v.created_at
            AND pr.status = 'approved'
        )
      ))
    )
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Apply discount if voucher found
  IF v_voucher.id IS NOT NULL THEN
    NEW.amount_eur := GREATEST(0, NEW.amount_eur - v_voucher.amount_eur);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payment_requests table
DROP TRIGGER IF EXISTS apply_voucher_discount_trigger ON public.payment_requests;
CREATE TRIGGER apply_voucher_discount_trigger
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_voucher_to_payment();