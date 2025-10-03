-- Drop existing functions first
DROP FUNCTION IF EXISTS public.admin_approve_payment(uuid);
DROP FUNCTION IF EXISTS public.admin_reject_payment(uuid, text);
DROP FUNCTION IF EXISTS public.request_payment(uuid, numeric, text, text, text);

-- RPC para cliente submeter pedido de pagamento
CREATE OR REPLACE FUNCTION public.request_payment(
  p_reservation_id uuid,
  p_amount_eur numeric,
  p_currency text DEFAULT 'EUR',
  p_proof_url text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_user_id uuid;
BEGIN
  -- Get user_id from reservation
  SELECT user_id INTO v_user_id
  FROM reservations
  WHERE id = p_reservation_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;

  -- Create payment request
  INSERT INTO payment_requests (
    user_id,
    reservation_id,
    amount_eur,
    currency,
    proof_url,
    note,
    status
  ) VALUES (
    v_user_id,
    p_reservation_id,
    p_amount_eur,
    p_currency,
    p_proof_url,
    p_note,
    'pending'
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- RPC para admin aprovar pagamento
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
  v_user_id uuid;
  v_starts_at timestamp with time zone;
  v_ends_at timestamp with time zone;
  v_service_id uuid;
  v_booking_id uuid;
BEGIN
  -- Verify admin permission
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Get reservation details from payment request
  SELECT pr.reservation_id, pr.user_id
  INTO v_reservation_id, v_user_id
  FROM payment_requests pr
  WHERE pr.id = p_payment_id AND pr.status = 'pending';

  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION 'Pedido de pagamento não encontrado ou já processado';
  END IF;

  -- Get reservation details
  SELECT starts_at, ends_at, service_id
  INTO v_starts_at, v_ends_at, v_service_id
  FROM reservations
  WHERE id = v_reservation_id;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Reserva inválida';
  END IF;

  -- Create booking
  INSERT INTO bookings (user_id, service_id, starts_at, ends_at, status)
  VALUES (v_user_id, v_service_id, v_starts_at, v_ends_at, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- Create unavailable slot with 1h buffer
  INSERT INTO unavailable_slots (start_time, end_time, reason)
  VALUES (
    v_starts_at,
    v_ends_at + INTERVAL '1 hour',
    'Sessão aprovada + descanso'
  );

  -- Update payment request status
  UPDATE payment_requests
  SET status = 'approved',
      decided_at = now(),
      decided_by = auth.uid()
  WHERE id = p_payment_id;

  -- Update reservation status
  UPDATE reservations
  SET status = 'confirmed'
  WHERE id = v_reservation_id;
END;
$$;

-- RPC para admin rejeitar pagamento
CREATE OR REPLACE FUNCTION public.admin_reject_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
BEGIN
  -- Verify admin permission
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Get reservation ID from payment request
  SELECT reservation_id
  INTO v_reservation_id
  FROM payment_requests
  WHERE id = p_payment_id AND status = 'pending';

  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION 'Pedido de pagamento não encontrado ou já processado';
  END IF;

  -- Update payment request status
  UPDATE payment_requests
  SET status = 'rejected',
      note = COALESCE(p_reason, note),
      decided_at = now(),
      decided_by = auth.uid()
  WHERE id = p_payment_id;

  -- Update reservation status
  UPDATE reservations
  SET status = 'rejected'
  WHERE id = v_reservation_id;

  -- Delete reservation (optional - could keep for history)
  DELETE FROM reservations WHERE id = v_reservation_id;
END;
$$;