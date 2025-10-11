-- Update the get_voucher_status function to check account creation date
CREATE OR REPLACE FUNCTION public.get_voucher_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_voucher_at timestamp with time zone;
  v_created_at timestamp with time zone;
  v_available boolean;
  v_days_left integer;
  v_days_since_creation integer;
BEGIN
  -- Get last voucher claim date and account creation date
  SELECT last_voucher_at, created_at INTO v_last_voucher_at, v_created_at
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If user never claimed a voucher, check if account is 90 days old
  IF v_last_voucher_at IS NULL THEN
    v_days_since_creation := EXTRACT(DAY FROM (NOW() - v_created_at))::integer;
    
    IF v_days_since_creation >= 90 THEN
      v_available := true;
      v_days_left := 0;
    ELSE
      v_available := false;
      v_days_left := 90 - v_days_since_creation;
    END IF;
  -- If user already claimed a voucher, check if 90 days passed since last claim
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