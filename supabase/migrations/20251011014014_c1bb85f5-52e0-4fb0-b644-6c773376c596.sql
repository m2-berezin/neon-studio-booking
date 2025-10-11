-- Just update subscribe_request to use the existing subscription service
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
  v_client_name text;
  v_subscription_service_id uuid;
BEGIN
  IF p_plan_type NOT IN ('S', 'X') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  -- Get client name
  SELECT full_name INTO v_client_name FROM public.profiles WHERE id = p_user_id;

  -- Determine service name based on plan type
  IF p_plan_type = 'S' THEN
    v_service_name := 'Subscrição Plano S';
  ELSE
    v_service_name := 'Subscrição Plano X';
  END IF;

  -- Get the subscription service ID (dedicated service for subscriptions)
  SELECT id INTO v_subscription_service_id 
  FROM public.services 
  WHERE slug = 'subscription-service' 
  LIMIT 1;

  -- Fallback to any service if subscription service doesn't exist
  IF v_subscription_service_id IS NULL THEN
    SELECT id INTO v_subscription_service_id FROM public.services LIMIT 1;
  END IF;

  -- Check if user already has an active subscription - deactivate it
  UPDATE public.subscriptions 
  SET is_active = false 
  WHERE user_id = p_user_id AND is_active = true;

  -- Create the subscription (pending approval, inactive)
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

  -- Create a reservation with correct subscription data in snapshot
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
    v_subscription_service_id,
    v_service_name,  -- EXPLICITLY set to 'Subscrição Plano S' or 'Subscrição Plano X'
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

  -- Send notification to admin (all admins)
  INSERT INTO public.notifications (user_id, role, title, body)
  SELECT 
    id,
    'admin',
    'Nova Subscrição Pendente',
    CONCAT(COALESCE(v_client_name, 'Cliente'), ' subscreveu o ', v_service_name, ' (€', p_amount_eur::text, '). Aguarda aprovação.')
  FROM public.profiles
  WHERE role = 'admin';

  RETURN v_payment_request_id;
END;
$$;