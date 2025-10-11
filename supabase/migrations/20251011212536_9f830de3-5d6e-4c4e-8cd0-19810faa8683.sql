-- Drop old functions completely
DROP FUNCTION IF EXISTS public.send_transfer_email(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_approve_payment(uuid);

-- Create admin_approve_payment function without email sending
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_reservation_id uuid;
  v_amount_eur numeric;
  v_currency text;
  v_service_id uuid;
  v_starts_at timestamp with time zone;
  v_ends_at timestamp with time zone;
  v_duration_minutes_snapshot integer;
  v_service_name_snapshot text;
  v_price_eur_snapshot numeric;
  v_currency_snapshot text;
  v_booking_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  -- Get payment request and reservation details
  SELECT 
    pr.user_id,
    pr.reservation_id,
    pr.amount_eur,
    pr.currency,
    r.service_id,
    r.starts_at,
    r.ends_at,
    r.duration_minutes_snapshot,
    r.service_name_snapshot,
    r.price_eur_snapshot,
    r.currency_snapshot
  INTO 
    v_client_id,
    v_reservation_id,
    v_amount_eur,
    v_currency,
    v_service_id,
    v_starts_at,
    v_ends_at,
    v_duration_minutes_snapshot,
    v_service_name_snapshot,
    v_price_eur_snapshot,
    v_currency_snapshot
  FROM payment_requests pr
  LEFT JOIN reservations r ON r.id = pr.reservation_id
  WHERE pr.id = p_payment_id AND pr.status = 'pending';

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Payment request not found or not pending';
  END IF;

  -- Update payment request status
  UPDATE payment_requests
  SET 
    status = 'approved',
    decided_by = auth.uid(),
    decided_at = NOW()
  WHERE id = p_payment_id;

  -- Create payment record
  INSERT INTO payments (
    payment_request_id,
    user_id,
    amount_eur,
    currency,
    status
  ) VALUES (
    p_payment_id,
    v_client_id,
    v_amount_eur,
    COALESCE(v_currency, 'EUR'),
    'paid'
  );

  -- Create booking if reservation exists
  IF v_reservation_id IS NOT NULL THEN
    INSERT INTO bookings (
      user_id,
      service_id,
      starts_at,
      ends_at,
      duration_minutes_snapshot,
      service_name_snapshot,
      price_eur_snapshot,
      currency_snapshot,
      status
    )
    VALUES (
      v_client_id,
      v_service_id,
      v_starts_at,
      v_ends_at,
      v_duration_minutes_snapshot,
      v_service_name_snapshot,
      v_price_eur_snapshot,
      COALESCE(v_currency_snapshot, 'EUR'),
      'confirmed'
    )
    RETURNING id INTO v_booking_id;

    -- Create unavailable slot (session + 1h buffer) only if starts_at exists
    IF v_starts_at IS NOT NULL AND v_ends_at IS NOT NULL THEN
      INSERT INTO unavailable_slots (starts_at, ends_at, reason)
      VALUES (
        v_starts_at,
        v_ends_at + INTERVAL '1 hour',
        'Sessão aprovada + descanso'
      );
    END IF;

    -- Delete reservation after booking is created
    DELETE FROM reservations WHERE id = v_reservation_id;
  END IF;

  -- Send notification to client
  INSERT INTO notifications (user_id, role, title, body)
  VALUES (
    v_client_id,
    'user',
    'Pagamento Confirmado! ✅',
    'O teu pagamento foi confirmado! A tua reserva está ativa. Vê os detalhes na tab Projetos.'
  );

  RETURN TRUE;
END;
$function$;