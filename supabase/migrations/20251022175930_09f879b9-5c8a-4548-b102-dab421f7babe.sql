-- Update admin_approve_payment to work with coins system
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  v_is_mixmaster boolean;
  v_is_loyalty_offer boolean;
  v_existing_subscription record;
  v_old_subscription_id uuid;
  v_friend_code text;
  v_code_owner_id uuid;
  v_friend_code_use_id uuid;
  v_coins_used integer;
begin
  if not is_admin() then
    raise exception 'Only admins can approve';
  end if;

  select pr.*, r.offer_id, r.service_name_snapshot, pr.friend_code, pr.coins_used
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
  v_coins_used := COALESCE(v_res.coins_used, 0);

  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  -- Deduct coins if used
  IF v_coins_used > 0 THEN
    PERFORM public.use_coins(v_client_id, v_coins_used, p_payment_id);
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

    -- Award coins to code owner when friend uses coins in subscription
    if v_friend_code is not null AND v_coins_used > 0 then
      select user_id into v_code_owner_id
      from public.referral_codes
      where code = v_friend_code;
      
      if v_code_owner_id is not null then
        update public.referral_codes
        set times_used = times_used + 1
        where code = v_friend_code;
        
        PERFORM public.award_coins(
          v_code_owner_id,
          2500,
          'referral_earned',
          now() + interval '30 days',
          NULL,
          NULL
        );
        
        insert into public.notifications (user_id, role, title, body)
        values (
          v_code_owner_id,
          'user',
          'Ganhaste 2500 GW!',
          '1 amigo usou o teu código e gastou moedas! Tens 30 dias para usar.'
        );
      end if;
    end if;

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

    -- Award coins to code owner when friend uses coins in booking
    if v_friend_code is not null AND v_coins_used > 0 then
      select user_id into v_code_owner_id
      from public.referral_codes
      where code = v_friend_code;
      
      if v_code_owner_id is not null then
        update public.referral_codes
        set times_used = times_used + 1
        where code = v_friend_code;
        
        PERFORM public.award_coins(
          v_code_owner_id,
          2500,
          'referral_earned',
          now() + interval '30 days',
          NULL,
          NULL
        );
        
        insert into public.notifications (user_id, role, title, body)
        values (
          v_code_owner_id,
          'user',
          'Ganhaste 2500 GW!',
          '1 amigo usou o teu código e gastou moedas! Tens 30 dias para usar.'
        );
      end if;
    end if;

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
$$;

-- Update useFriendCode to award 2500GW immediately when code is used
CREATE OR REPLACE FUNCTION public.apply_friend_code_with_coins(p_user_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code_owner_id uuid;
  v_existing_use record;
  v_friend_code_use_id uuid;
BEGIN
  -- Check if code exists
  SELECT user_id INTO v_code_owner_id
  FROM public.referral_codes
  WHERE code = p_code AND is_active = true
  LIMIT 1;

  IF v_code_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou inativo');
  END IF;

  -- Check if user is using their own code
  IF v_code_owner_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não podes usar o teu próprio código');
  END IF;

  -- Check if user already used a code (allow only one code per user)
  SELECT * INTO v_existing_use
  FROM public.friend_code_uses
  WHERE used_by = p_user_id
  LIMIT 1;

  IF v_existing_use.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já usaste um código de amigo anteriormente');
  END IF;

  -- Record the friend code use
  INSERT INTO public.friend_code_uses (code, used_by, used_in_payment)
  VALUES (p_code, p_user_id, false)
  RETURNING id INTO v_friend_code_use_id;

  -- Award 2500GW to the user who used the code (expires in 30 days)
  PERFORM public.award_coins(
    p_user_id,
    2500,
    'referral_used',
    now() + interval '30 days',
    v_friend_code_use_id,
    NULL
  );

  -- Send notification to user
  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    p_user_id,
    'user',
    'Ganhaste 2500 GW!',
    'Código de amigo aplicado! Tens 30 dias para usar as moedas.'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'coins_awarded', 2500,
    'expires_in_days', 30
  );
END;
$$;