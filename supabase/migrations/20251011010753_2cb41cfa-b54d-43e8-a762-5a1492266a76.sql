-- Update subscribe_request function to use proper naming for subscriptions
CREATE OR REPLACE FUNCTION public.subscribe_request(p_user_id uuid, p_plan_type text, p_amount_eur numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment_request_id uuid;
  v_subscription_id uuid;
  v_reservation_id uuid;
  v_service_name text;
BEGIN
  IF p_plan_type NOT IN ('S', 'X') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  -- Determine service name based on plan type
  IF p_plan_type = 'S' THEN
    v_service_name := 'Subscrição Plano S';
  ELSE
    v_service_name := 'Subscrição Plano X';
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

  -- Get any service ID for the foreign key constraint
  SELECT id INTO v_reservation_id FROM public.services LIMIT 1;

  -- Create a dummy reservation for subscription
  INSERT INTO public.reservations (
    user_id,
    service_id,
    service_name_snapshot,
    price_eur_snapshot,
    duration_minutes_snapshot,
    currency_snapshot,
    status
  )
  VALUES (
    p_user_id,
    v_reservation_id,
    v_service_name,
    p_amount_eur,
    0,
    'EUR',
    'pending'
  )
  RETURNING id INTO v_reservation_id;

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
    v_reservation_id,
    p_amount_eur,
    'EUR',
    'subscription',
    v_subscription_id,
    'pending'
  )
  RETURNING id INTO v_payment_request_id;

  RETURN v_payment_request_id;
END;
$$;