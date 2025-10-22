-- Update create_subscription_payment_request to accept points_used parameter
CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(
  p_user_id uuid, 
  p_plan_type text, 
  p_amount_eur numeric, 
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
    payment_method,
    points_used,
    status
  )
  VALUES (
    p_user_id,
    p_amount_eur,
    'EUR',
    'subscription_request',
    p_plan_type,
    p_friend_code,
    p_payment_method,
    p_points_used,
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

-- Update admin_approve_payment to deduct points when used
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_is_mixmaster boolean;
  v_is_loyalty_offer boolean;
  v_existing_subscription record;
  v_old_subscription_id uuid;
  v_friend_code text;
  v_code_owner_id uuid;
  v_friend_code_use_id uuid;
  v_points_used integer;
begin
  if not is_admin() then
    raise exception 'Only admins can approve';
  end if;

  select pr.*, r.offer_id, r.service_name_snapshot, pr.friend_code, pr.points_used
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
  v_is_loyalty_offer := (v_res.type = 'loyalty_mixmaster');
  v_friend_code := v_res.friend_code;
  v_points_used := COALESCE(v_res.points_used, 0);

  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  -- Deduct points if used
  IF v_points_used > 0 THEN
    PERFORM public.use_points(v_client_id, v_points_used, p_payment_id);
  END IF;

  if v_res.type = 'subscription_request' then
    v_plan_type := v_res.plan_type;
    if v_plan_type is null then
      raise exception 'Plano não encontrado';
    end if;

    select * into v_existing_subscription 
    from public.subscriptions 
    where user_id = v_client_id and is_active = true
    limit 1;

    if v_existing_subscription.id is not null then
      v_old_subscription_id := v_existing_subscription.id;
      delete from public.subscriptions where id = v_old_subscription_id;
    end if;

    insert into public.subscriptions (user_id, plan_type, price_eur, end_date, payment_status, is_active)
    values (v_client_id, v_plan_type, v_res.amount_eur, now() + interval '1 month', 'confirmed', true)
    returning id into v_subscription_id;

    if v_old_subscription_id is not null then
      insert into public.plan_discounts (subscription_id, month_num, discount_pct)
      select v_subscription_id, month_num, discount_pct
      from public.plan_discounts
      where subscription_id = v_old_subscription_id;
      
      delete from public.plan_discounts where subscription_id = v_old_subscription_id;
    else
      insert into public.plan_discounts (subscription_id, month_num, discount_pct)
      values (v_subscription_id, 1, 10.00);
    end if;

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

    if v_offer_id is not null then
      v_current_month := date_trunc('month', now());
      
      insert into public.user_offers (user_id, offer_id, month_year, used_count)
      values (v_client_id, v_offer_id, v_current_month, 1)
      on conflict (user_id, offer_id, month_year) 
      do update set used_count = user_offers.used_count + 1;
    end if;

    v_is_mixmaster := (v_service_name ILIKE '%mix%master%' OR v_service_name ILIKE '%mix&master%' OR v_service_name ILIKE '%mixmaster%');
    
    if v_is_mixmaster AND NOT v_is_loyalty_offer then
      insert into public.loyalty_points (user_id, booking_id, points_earned)
      values (v_client_id, v_booking_id, 1);
    end if;

    if v_is_loyalty_offer then
      with oldest_points as (
        select id from public.loyalty_points 
        where user_id = v_client_id 
        order by earned_at asc 
        limit 7
      )
      delete from public.loyalty_points where id in (select id from oldest_points);
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
$function$;