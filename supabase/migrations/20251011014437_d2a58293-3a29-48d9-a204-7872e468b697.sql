-- Fix subscribe_request to NOT create any reservation
-- Subscriptions should NOT appear in projects/bookings
CREATE OR REPLACE FUNCTION public.subscribe_request(p_user_id uuid, p_plan_type text, p_amount_eur numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment_request_id uuid;
  v_subscription_id uuid;
  v_service_name text;
  v_client_name text;
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

  -- Create payment request WITHOUT reservation (subscriptions don't need reservations)
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
    NULL,  -- NO RESERVATION for subscriptions
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

-- Fix admin_renew_subscription to properly update payment_status to confirmed
CREATE OR REPLACE FUNCTION public.admin_renew_subscription(p_subscription_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_plan_type text;
  v_month_num integer;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage subscriptions';
  END IF;

  IF p_action NOT IN ('aceitar', 'renovar', 'recusar') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  -- Get subscription
  SELECT user_id, plan_type INTO v_user_id, v_plan_type 
  FROM public.subscriptions 
  WHERE id = p_subscription_id 
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Subscrição não encontrada';
  END IF;

  IF p_action = 'aceitar' THEN
    -- Aceitar: activate with 10% discount for month 1, CONFIRM PAYMENT STATUS
    UPDATE public.subscriptions 
    SET payment_status = 'confirmed',  -- CRITICAL: Update to confirmed
        end_date = now() + interval '1 month', 
        is_active = true, 
        start_date = now() 
    WHERE id = p_subscription_id;
    
    -- Update payment request to confirmed
    UPDATE public.payment_requests
    SET status = 'confirmed'
    WHERE subscription_id = p_subscription_id AND status = 'pending';
    
    -- Create discount
    DELETE FROM public.plan_discounts WHERE subscription_id = p_subscription_id;
    INSERT INTO public.plan_discounts (subscription_id, month_num, discount_pct) 
    VALUES (p_subscription_id, 1, 10.00);
    
    -- Re-create offers
    DELETE FROM public.plan_offers WHERE subscription_id = p_subscription_id;
    INSERT INTO public.plan_offers (subscription_id, offer_type) 
    VALUES (p_subscription_id, CASE v_plan_type WHEN 'S' THEN 'mix_master' WHEN 'X' THEN 'captacao_mix_master' END);
    
    -- Send notification
    INSERT INTO public.notifications (user_id, role, title, body)
    VALUES (v_user_id, 'user', 'Subscrição aceite', 'A tua subscrição foi aceite e está ativa!');

  ELSIF p_action = 'renovar' THEN
    -- Renovar: extend by 1 month, apply 15% discount, continue counting, CONFIRM PAYMENT
    UPDATE public.subscriptions 
    SET end_date = end_date + interval '1 month', 
        payment_status = 'confirmed'  -- CRITICAL: Update to confirmed
    WHERE id = p_subscription_id;
    
    -- Update payment request to confirmed
    UPDATE public.payment_requests
    SET status = 'confirmed'
    WHERE subscription_id = p_subscription_id AND status = 'pending';
    
    -- Calculate current month number
    SELECT EXTRACT(MONTH FROM AGE(NOW(), (SELECT start_date FROM public.subscriptions WHERE id = p_subscription_id))) + 1 
    INTO v_month_num;
    
    -- Add 15% discount for next month
    INSERT INTO public.plan_discounts (subscription_id, month_num, discount_pct) 
    VALUES (p_subscription_id, v_month_num, 15.00)
    ON CONFLICT (subscription_id, month_num) DO UPDATE SET discount_pct = 15.00;
    
    -- Send notification
    INSERT INTO public.notifications (user_id, role, title, body)
    VALUES (v_user_id, 'user', 'Subscrição renovada', 'A tua subscrição foi renovada por mais um mês!');

  ELSE  -- 'recusar'
    -- Recusar: cancel subscription, remove benefits
    UPDATE public.subscriptions 
    SET is_active = false, 
        payment_status = 'cancelled' 
    WHERE id = p_subscription_id;
    
    -- Update payment request to rejected
    UPDATE public.payment_requests
    SET status = 'rejected'
    WHERE subscription_id = p_subscription_id AND status = 'pending';
    
    DELETE FROM public.plan_discounts WHERE subscription_id = p_subscription_id;
    DELETE FROM public.plan_offers WHERE subscription_id = p_subscription_id;
    
    -- Send notification
    INSERT INTO public.notifications (user_id, role, title, body)
    VALUES (v_user_id, 'user', 'Subscrição recusada', 'A tua subscrição foi recusada.');
  END IF;

  RETURN TRUE;
END;
$$;