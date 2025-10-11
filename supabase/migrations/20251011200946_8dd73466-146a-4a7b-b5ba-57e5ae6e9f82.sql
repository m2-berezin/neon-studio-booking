-- Remove expiration from vouchers (vouchers only become inactive when used, not by time)
-- The 90-day limit is controlled by last_voucher_at in profiles table

-- Update claim_voucher function to create vouchers without expiration
CREATE OR REPLACE FUNCTION public.claim_voucher(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status jsonb;
  v_voucher_id uuid;
BEGIN
  -- Check if voucher is available
  v_status := public.get_voucher_status(p_user_id);
  
  IF NOT (v_status->>'available')::boolean THEN
    RAISE EXCEPTION 'Voucher ainda não disponível. Faltam % dias.', v_status->>'days_left';
  END IF;
  
  -- Create voucher without expiration (will be inactivated when used)
  INSERT INTO public.vouchers (client_id, amount_eur, code, expires_at)
  VALUES (p_user_id, 15.00, 'VOUCHER15-' || gen_random_uuid()::text, NULL)
  RETURNING id INTO v_voucher_id;
  
  -- Update last_voucher_at to NOW to start the 90-day countdown for next voucher
  UPDATE public.profiles
  SET last_voucher_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_voucher_id;
END;
$$;