-- Create get_voucher_status function
CREATE OR REPLACE FUNCTION public.get_voucher_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_voucher_at timestamp with time zone;
  v_available boolean;
  v_days_left integer;
BEGIN
  -- Get last voucher claim date
  SELECT last_voucher_at INTO v_last_voucher_at
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check if voucher is available (90 days since last claim or never claimed)
  IF v_last_voucher_at IS NULL THEN
    v_available := true;
    v_days_left := 0;
  ELSIF (NOW() - v_last_voucher_at) >= INTERVAL '90 days' THEN
    v_available := true;
    v_days_left := 0;
  ELSE
    v_available := false;
    v_days_left := CEIL(EXTRACT(EPOCH FROM (v_last_voucher_at + INTERVAL '90 days' - NOW())) / 86400)::integer;
  END IF;
  
  RETURN jsonb_build_object(
    'available', v_available,
    'days_left', v_days_left
  );
END;
$$;

-- Create claim_voucher function
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
  
  -- Create voucher
  INSERT INTO public.vouchers (client_id, amount_eur, code, expires_at)
  VALUES (p_user_id, 15.00, 'VOUCHER15-' || gen_random_uuid()::text, NOW() + INTERVAL '30 days')
  RETURNING id INTO v_voucher_id;
  
  -- Update last_voucher_at
  UPDATE public.profiles
  SET last_voucher_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_voucher_id;
END;
$$;