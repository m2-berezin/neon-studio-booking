-- Fix admin_approve_payment to handle 'subscription' type correctly
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_res record;
  v_booking_id uuid;
  v_client_id uuid;
  v_offer_id uuid;
  v_subscription_id uuid;
  v_plan_type text;
  v_client_name text;
  v_service_name text;
  v_transfer_link text;
  v_note text;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;

  -- Get payment request with optional reservation
  SELECT pr.*, r.offer_id, r.service_name_snapshot, pr.transfer_link, pr.note
    INTO v_res
  FROM public.payment_requests pr
  LEFT JOIN public.reservations r ON r.id = pr.reservation_id
  WHERE pr.id = p_payment_id AND pr.status = 'pending';

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Payment request not found or not pending';
  END IF;

  v_client_id := v_res.user_id;
  v_offer_id := v_res.offer_id;
  v_service_name := v_res.service_name_snapshot;
  v_transfer_link := v_res.transfer_link;
  v_note := v_res.note;

  SELECT full_name INTO v_client_name FROM public.profiles WHERE id = v_client_id LIMIT 1;

  -- Handle subscription payment (NEW: check for 'subscription' OR 'subscription_request')
  IF v_res.type IN ('subscription', 'subscription_request') THEN
    v_plan_type := v_res.plan_type;
    IF v_plan_type IS NULL THEN
      RAISE EXCEPTION 'Plano não encontrado';
    END IF;

    -- Update existing subscription or create if doesn't exist
    SELECT id INTO v_subscription_id 
    FROM public.subscriptions 
    WHERE user_id = v_client_id AND is_active = true
    LIMIT 1;

    IF v_subscription_id IS NOT NULL THEN
      -- Update existing subscription
      UPDATE public.subscriptions
      SET payment_status = 'confirmed',
          end_date = now() + interval '1 month',
          plan_type = v_plan_type,
          price_eur = v_res.amount_eur
      WHERE id = v_subscription_id;
    ELSE
      -- Create new subscription
      INSERT INTO public.subscriptions (user_id, plan_type, price_eur, start_date, end_date, payment_status, is_active)
      VALUES (v_client_id, v_plan_type, v_res.amount_eur, now(), now() + interval '1 month', 'confirmed', true)
      RETURNING id INTO v_subscription_id;
    END IF;

    -- Add first month discount
    INSERT INTO public.plan_discounts (subscription_id, month_num, discount_pct)
    VALUES (v_subscription_id, 1, 10.00)
    ON CONFLICT (subscription_id, month_num) DO NOTHING;

    -- Add subsequent months discount
    INSERT INTO public.plan_discounts (subscription_id, month_num, discount_pct)
    SELECT v_subscription_id, month_num, 15.00
    FROM generate_series(2, 12) AS month_num
    ON CONFLICT (subscription_id, month_num) DO NOTHING;

    -- Notify client
    INSERT INTO public.notifications (user_id, role, title, body)
    VALUES (v_client_id, 'user', 'Subscrição ativada!', 'A tua subscrição foi ativada por mais um mês!');

    -- Approve payment request
    UPDATE public.payment_requests 
    SET status = 'approved', decided_by = auth.uid(), decided_at = now() 
    WHERE id = p_payment_id;

    RETURN v_subscription_id;

  -- Handle regular reservation payment
  ELSE
    -- Check that reservation exists for non-subscription payments
    IF v_res.reservation_id IS NULL THEN
      RAISE EXCEPTION 'Reservation ID not found';
    END IF;

    -- Approve payment request
    UPDATE public.payment_requests 
    SET status = 'approved', decided_by = auth.uid(), decided_at = now() 
    WHERE id = p_payment_id;

    -- Create booking from reservation
    INSERT INTO public.bookings (
      user_id, service_id, starts_at, ends_at,
      service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot,
      status
    )
    SELECT 
      user_id, service_id, starts_at, ends_at,
      service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot,
      'confirmed'
    FROM public.reservations
    WHERE id = v_res.reservation_id
    RETURNING id INTO v_booking_id;

    -- Create payment record
    INSERT INTO public.payments (
      payment_request_id, booking_id, user_id, amount_eur, currency, status
    )
    VALUES (
      p_payment_id, v_booking_id, v_res.user_id, v_res.amount_eur, COALESCE(v_res.currency, 'EUR'), 'paid'
    );

    -- Notify client
    INSERT INTO public.notifications (user_id, role, title, body)
    VALUES (
      v_client_id,
      'user',
      'Reserva confirmada!',
      'A tua reserva foi aprovada e confirmada!'
    );

    -- Block calendar with buffer time
    IF EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_id AND starts_at IS NOT NULL) THEN
      INSERT INTO public.unavailable_slots (starts_at, ends_at, reason)
      SELECT 
        starts_at,
        ends_at + interval '1 hour',
        'Sessão + 1h descanso'
      FROM public.bookings
      WHERE id = v_booking_id;
    END IF;

    -- Delete reservation (now converted to booking)
    DELETE FROM public.reservations WHERE id = v_res.reservation_id;

    -- Send mixmaster email if applicable
    IF v_transfer_link IS NOT NULL AND v_service_name ILIKE '%Mix%Master%' THEN
      PERFORM http_post(
        'https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-mixmaster-email',
        json_build_object(
          'payment_id', p_payment_id,
          'transfer_link', v_transfer_link,
          'client_name', v_client_name,
          'service_name', v_service_name,
          'notes', COALESCE(v_note, 'Sem notas')
        )::jsonb,
        json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdWFzY3NybGZkYmNwaWt6dmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjczMjEsImV4cCI6MjA3NDMwMzMyMX0.ySDA7sSX9g57F4csJ8ypqFGzdj_aVH9hxuHd0qlQylU'
        )::jsonb
      );
    END IF;

    RETURN v_booking_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_payment(uuid) TO authenticated;