-- Update request_payment RPC to accept and store friend_code
CREATE OR REPLACE FUNCTION public.request_payment(
  p_reservation_id uuid, 
  p_amount_eur numeric, 
  p_currency text DEFAULT 'EUR'::text, 
  p_proof_url text DEFAULT NULL::text, 
  p_note text DEFAULT NULL::text, 
  p_voucher_id uuid DEFAULT NULL::uuid,
  p_friend_code text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_id uuid;
BEGIN
  INSERT INTO public.payment_requests (
    reservation_id,
    user_id,
    amount_eur,
    currency,
    proof_url,
    note,
    voucher_id,
    friend_code,
    status
  )
  VALUES (
    p_reservation_id,
    auth.uid(),
    p_amount_eur,
    p_currency,
    p_proof_url,
    p_note,
    p_voucher_id,
    p_friend_code,
    'pending'
  )
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$function$;

-- Update create_subscription_payment_request to accept and store friend_code
CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(
  p_user_id uuid, 
  p_plan_type text, 
  p_amount_eur numeric,
  p_friend_code text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_request_id uuid;
BEGIN
  -- Validate plan type
  IF p_plan_type NOT IN ('S', 'X') THEN
    RAISE EXCEPTION 'Plano inválido: %', p_plan_type;
  END IF;

  -- Create payment request without touching subscriptions table
  INSERT INTO public.payment_requests (
    user_id,
    amount_eur,
    currency,
    type,
    plan_type,
    friend_code,
    status
  )
  VALUES (
    p_user_id,
    p_amount_eur,
    'EUR',
    'subscription_request',
    p_plan_type,
    p_friend_code,
    'pending'
  )
  RETURNING id INTO v_payment_request_id;

  -- Send notification to admin
  INSERT INTO public.notifications (user_id, role, title, body)
  SELECT 
    id,
    'admin',
    'Novo Pedido de Subscrição',
    'Um cliente solicitou subscrição Plano ' || p_plan_type
  FROM public.profiles
  WHERE role = 'admin';

  RETURN v_payment_request_id;
END;
$function$;