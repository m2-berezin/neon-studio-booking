-- Ensure subscribe_payment_request function exists
CREATE OR REPLACE FUNCTION public.subscribe_payment_request(
  p_user_id uuid,
  p_plan_type text,
  p_amount_eur numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_request_id uuid;
  v_subscription_id uuid;
BEGIN
  IF p_plan_type NOT IN ('S', 'X') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  -- Get subscription ID
  SELECT id INTO v_subscription_id
  FROM public.subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Subscrição não encontrada';
  END IF;

  -- Create payment request
  INSERT INTO public.payment_requests (
    user_id,
    amount_eur,
    currency,
    type,
    subscription_id,
    status
  )
  VALUES (
    p_user_id,
    p_amount_eur,
    'EUR',
    'subscription',
    v_subscription_id,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;