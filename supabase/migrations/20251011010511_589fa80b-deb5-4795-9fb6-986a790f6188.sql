-- Drop existing subscribe_request function
DROP FUNCTION IF EXISTS public.subscribe_request(uuid, text, numeric);

-- Recreate subscribe_request function that creates a subscription first
CREATE OR REPLACE FUNCTION public.subscribe_request(p_user_id uuid, p_plan_type text, p_amount_eur numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_id uuid;
  v_subscription_id uuid;
BEGIN
  IF p_plan_type NOT IN ('S', 'X') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  -- Create the subscription first (pending approval)
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    price_eur,
    payment_status,
    is_active
  )
  VALUES (
    p_user_id,
    p_plan_type,
    p_amount_eur,
    'pending',
    false
  )
  RETURNING id INTO v_subscription_id;

  -- Create a dummy reservation for subscription to satisfy NOT NULL constraint
  INSERT INTO public.reservations (
    user_id,
    service_id,
    service_name_snapshot,
    price_eur_snapshot,
    duration_minutes_snapshot,
    currency_snapshot,
    status
  )
  SELECT 
    p_user_id,
    s.id,
    'Subscrição ' || p_plan_type,
    p_amount_eur,
    0,
    'EUR',
    'pending'
  FROM public.services s
  WHERE s.slug = 'subscription'
  LIMIT 1
  RETURNING id INTO v_request_id;

  -- If no subscription service exists, create reservation without service_id reference
  IF v_request_id IS NULL THEN
    INSERT INTO public.reservations (
      user_id,
      service_id,
      service_name_snapshot,
      price_eur_snapshot,
      duration_minutes_snapshot,
      currency_snapshot,
      status
    )
    SELECT 
      p_user_id,
      (SELECT id FROM public.services LIMIT 1), -- Use any service as placeholder
      'Subscrição ' || p_plan_type,
      p_amount_eur,
      0,
      'EUR',
      'pending'
    RETURNING id INTO v_request_id;
  END IF;

  -- Create payment request linked to subscription
  INSERT INTO public.payment_requests (
    user_id,
    reservation_id,
    amount_eur,
    currency,
    type,
    subscription_id,
    status
  )
  VALUES (
    p_user_id,
    v_request_id,
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