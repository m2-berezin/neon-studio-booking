-- Create apply_offer function to handle offer application
CREATE OR REPLACE FUNCTION public.apply_offer(
  p_user_id uuid,
  p_offer_id uuid,
  p_starts_at timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reservation_id uuid;
  v_offer record;
  v_current_month date;
  v_usage_count integer;
BEGIN
  -- Get offer details
  SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id AND is_active = true;
  
  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION 'Oferta não encontrada ou inativa';
  END IF;
  
  -- Check monthly usage limit
  v_current_month := date_trunc('month', now());
  
  SELECT COALESCE(used_count, 0) INTO v_usage_count
  FROM public.user_offers
  WHERE user_id = p_user_id 
    AND offer_id = p_offer_id 
    AND month_year = v_current_month;
  
  IF v_usage_count >= v_offer.limit_per_month THEN
    RAISE EXCEPTION 'Limite mensal de % usos atingido para esta oferta', v_offer.limit_per_month;
  END IF;
  
  -- Get the correct service for the offer (Captacao 2h for the "2h+1h grátis" offer)
  -- The offer is "Buy 2h, get +1h free" = 3h total for 20 EUR
  DECLARE
    v_service_id uuid;
  BEGIN
    SELECT id INTO v_service_id 
    FROM public.services 
    WHERE name ILIKE '%Captacao 2h%' 
      AND is_active = true 
    LIMIT 1;
    
    IF v_service_id IS NULL THEN
      RAISE EXCEPTION 'Serviço de Captação 2h não encontrado';
    END IF;
    
    -- Create reservation with offer_id
    INSERT INTO public.reservations (
      user_id,
      service_id,
      offer_id,
      starts_at,
      ends_at,
      service_name_snapshot,
      price_eur_snapshot,
      duration_minutes_snapshot,
      currency_snapshot,
      status
    )
    VALUES (
      p_user_id,
      v_service_id,
      p_offer_id,
      p_starts_at,
      CASE WHEN p_starts_at IS NOT NULL THEN p_starts_at + (v_offer.total_duration_min || ' minutes')::interval ELSE NULL END,
      v_offer.name,
      v_offer.price_eur,
      v_offer.total_duration_min,
      'EUR',
      'pending'
    )
    RETURNING id INTO v_reservation_id;
  END;
  
  RETURN v_reservation_id;
END;
$$;

-- Ensure admin_approve_payment increments user_offers when offer_id exists
-- This is the complete updated version
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_res record;
  v_booking_id uuid;
  v_client_id uuid;
  v_offer_id uuid;
  v_subscription_id uuid;
  v_plan_type text;
  v_client_name text;
  v_service_name text;
  v_voucher_id uuid;
  v_current_month date;
begin
  if not is_admin() then
    raise exception 'Only admins can approve';
  end if;

  select pr.*, r.offer_id, r.service_name_snapshot
    into v_res
  from public.payment_requests pr
  left join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending';

  if v_res.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_res.user_id;
  v_offer_id := v_res.offer_id;
  v_service_name := v_res.service_name_snapshot;

  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  if v_res.type = 'subscription_request' then
    v_plan_type := v_res.plan_type;
    if v_plan_type is null then
      raise exception 'Plano não encontrado';
    end if;

    insert into public.subscriptions (user_id, plan_type, price_eur, end_date, payment_status)
    values (v_client_id, v_plan_type, v_res.amount_eur, now() + interval '1 month', 'confirmed')
    on conflict (user_id) do update set plan_type = excluded.plan_type, price_eur = excluded.price_eur, end_date = excluded.end_date, payment_status = 'confirmed', is_active = true
    returning id into v_subscription_id;

    insert into public.plan_discounts (subscription_id, month_num, discount_pct)
    values (v_subscription_id, 1, 10.00)
    on conflict (subscription_id, month_num) do nothing;

    insert into public.notifications (user_id, role, title, body)
    values (v_client_id, 'user', 'Subscrição ativada!', 'A tua subscrição foi ativada por mais um mês!');

    update public.payment_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = p_payment_id;

    return v_res.id;

  else
    if v_res.reservation_id is null then
      raise exception 'Reservation ID not found';
    end if;

    update public.payment_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = p_payment_id;

    insert into public.bookings (
      user_id, service_id, starts_at, ends_at,
      service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot,
      status
    )
    select 
      user_id, service_id, starts_at, ends_at,
      service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot,
      'confirmed'
    from public.reservations
    where id = v_res.reservation_id
    returning id into v_booking_id;

    insert into public.payments (
      payment_request_id, booking_id, user_id, amount_eur, currency, status
    )
    values (
      p_payment_id, v_booking_id, v_res.user_id, v_res.amount_eur, coalesce(v_res.currency, 'EUR'), 'paid'
    );

    insert into public.notifications (user_id, role, title, body)
    values (
      v_client_id,
      'user',
      'Reserva confirmada!',
      'A tua reserva foi aprovada e confirmada!'
    );

    if exists (select 1 from public.payment_requests where id = p_payment_id and voucher_id is not null) then
      select voucher_id into v_voucher_id from public.payment_requests where id = p_payment_id;
      update public.vouchers set is_used = true where id = v_voucher_id;
    end if;

    -- INCREMENT user_offers when offer_id exists
    if v_offer_id is not null then
      v_current_month := date_trunc('month', now());
      
      insert into public.user_offers (user_id, offer_id, month_year, used_count)
      values (v_client_id, v_offer_id, v_current_month, 1)
      on conflict (user_id, offer_id, month_year) 
      do update set used_count = user_offers.used_count + 1;
      
      -- Log for debugging
      RAISE NOTICE 'Incremented user_offers for user_id: %, offer_id: %, month: %', v_client_id, v_offer_id, v_current_month;
    end if;

    if exists (select 1 from public.bookings where id = v_booking_id and starts_at is not null) then
      insert into public.unavailable_slots (starts_at, ends_at, reason)
      select 
        starts_at,
        ends_at + interval '1 hour',
        'Sessão + 1h descanso'
      from public.bookings
      where id = v_booking_id;
    end if;

    delete from public.reservations where id = v_res.reservation_id;

    return v_booking_id;
  end if;
end;
$$;

COMMENT ON FUNCTION public.apply_offer IS 'Creates a reservation with offer_id attached for tracking monthly usage limits';
COMMENT ON FUNCTION public.admin_approve_payment IS 'Approves payment and increments user_offers counter when offer_id exists';