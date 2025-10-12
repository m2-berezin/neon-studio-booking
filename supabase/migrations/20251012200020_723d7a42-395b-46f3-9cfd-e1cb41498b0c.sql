-- Create function to create payment request for subscription without creating the subscription itself
-- The subscription will be created/updated only when admin approves via admin_approve_payment

CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(
  p_user_id uuid,
  p_plan_type text,
  p_amount_eur numeric
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
    status
  )
  VALUES (
    p_user_id,
    p_amount_eur,
    'EUR',
    'subscription_request',
    p_plan_type,
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