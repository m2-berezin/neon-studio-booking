-- Update request_payment function to accept and save points_used parameter
CREATE OR REPLACE FUNCTION public.request_payment(
  p_reservation_id uuid,
  p_amount_eur numeric,
  p_currency text DEFAULT 'EUR'::text,
  p_proof_url text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_voucher_id uuid DEFAULT NULL::uuid,
  p_friend_code text DEFAULT NULL::text,
  p_payment_method text DEFAULT NULL::text,
  p_points_used integer DEFAULT 0
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
    payment_method,
    points_used,
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
    p_payment_method,
    p_points_used,
    'pending'
  )
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$function$;