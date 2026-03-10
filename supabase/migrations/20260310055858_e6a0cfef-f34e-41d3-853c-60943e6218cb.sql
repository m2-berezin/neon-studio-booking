
-- 1. Update claim_180day_offer: do NOT mark as claimed immediately
DROP FUNCTION IF EXISTS public.claim_180day_offer(uuid, text);

CREATE FUNCTION public.claim_180day_offer(p_user_id UUID, p_offer_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligibility JSONB;
  v_subscription_id UUID;
  v_offer_record_id UUID;
  v_service_id UUID;
  v_reservation_id UUID;
  v_check_offer_type TEXT;
BEGIN
  -- For mixmaster_with_captacao, check eligibility using base 'mixmaster' type
  IF p_offer_type = 'mixmaster_with_captacao' THEN
    v_check_offer_type := 'mixmaster';
  ELSE
    v_check_offer_type := p_offer_type;
  END IF;

  v_eligibility := public.check_180day_offer_eligibility(p_user_id, v_check_offer_type);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RAISE EXCEPTION 'Not eligible for this offer: %', v_eligibility->>'reason';
  END IF;
  
  v_subscription_id := (v_eligibility->>'subscription_id')::UUID;
  
  IF p_offer_type = 'mixmaster' THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE name ILIKE '%Mix & Master%' AND name NOT ILIKE '%Captação%' AND is_active = true LIMIT 1;
  ELSIF p_offer_type = 'mixmaster_with_captacao' THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE name = 'Captação 3h - 30EUR' AND is_active = true LIMIT 1;
  ELSIF p_offer_type = 'captacao_mixmaster' THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE name ILIKE '%3h + Mix&Master%' AND is_active = true LIMIT 1;
  END IF;
  
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Service not found for offer type: %', p_offer_type;
  END IF;
  
  -- Insert as NOT claimed (is_claimed = false) - will be claimed on admin approval
  INSERT INTO public.plan_180day_offers (subscription_id, user_id, plan_type, offer_type, is_claimed, claimed_at)
  SELECT v_subscription_id, p_user_id, s.plan_type, v_check_offer_type, false, NULL
  FROM public.subscriptions s WHERE s.id = v_subscription_id
  ON CONFLICT (subscription_id, offer_type) 
  DO UPDATE SET is_claimed = false, claimed_at = NULL
  RETURNING id INTO v_offer_record_id;
  
  INSERT INTO public.reservations (
    user_id, service_id, starts_at, status,
    service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot
  ) VALUES (
    p_user_id, v_service_id, NULL, 'pending',
    CASE 
      WHEN p_offer_type = 'mixmaster' THEN 'Mix&Master (Oferta Plano S - 180 dias)'
      WHEN p_offer_type = 'mixmaster_with_captacao' THEN 'Captação 3h + Mix&Master Grátis (Oferta Plano S - 180 dias)'
      ELSE 'Captação 3h + Mix&Master (Oferta Plano X - 180 dias)'
    END,
    CASE WHEN p_offer_type = 'mixmaster_with_captacao' THEN 30.00 ELSE 0.00 END,
    CASE WHEN p_offer_type = 'mixmaster' THEN 0 ELSE 180 END,
    'EUR'
  ) RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;

-- 2. Update check_180day_offer_eligibility to treat unclaimed records as still eligible
DROP FUNCTION IF EXISTS public.check_180day_offer_eligibility(uuid, text);

CREATE FUNCTION public.check_180day_offer_eligibility(p_user_id UUID, p_offer_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_offer RECORD;
  v_days_since_start INTEGER;
  v_days_remaining INTEGER;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY start_date DESC
  LIMIT 1;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'no_subscription', 'days_remaining', null);
  END IF;
  
  IF (p_offer_type = 'mixmaster' AND v_subscription.plan_type != 'S') OR
     (p_offer_type = 'captacao_mixmaster' AND v_subscription.plan_type != 'X') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'wrong_plan', 'days_remaining', null);
  END IF;
  
  v_days_since_start := EXTRACT(DAY FROM (NOW() - v_subscription.start_date))::INTEGER;
  v_days_remaining := GREATEST(0, 180 - v_days_since_start);
  
  -- Check if offer already FULLY claimed (is_claimed = true means admin approved)
  SELECT * INTO v_offer
  FROM public.plan_180day_offers
  WHERE subscription_id = v_subscription.id AND offer_type = p_offer_type AND is_claimed = true;
  
  IF v_offer.id IS NOT NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'already_claimed', 'days_remaining', 0);
  END IF;
  
  IF v_days_since_start >= 180 THEN
    RETURN jsonb_build_object('eligible', true, 'subscription_id', v_subscription.id, 'days_remaining', 0);
  ELSE
    RETURN jsonb_build_object('eligible', false, 'reason', 'waiting_period', 'days_remaining', v_days_remaining);
  END IF;
END;
$$;

-- 3. Update admin_approve_payment to mark 180-day offers as claimed
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_points_used integer;
  v_referee_code_use_id uuid;
  v_referrer_user_id uuid;
  v_referrer_name text;
  v_reward_already_given boolean;
  v_new_start timestamptz;
  v_new_end timestamptz;
  v_merged_start timestamptz;
  v_merged_end timestamptz;
  v_is_plan_180day boolean;
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
  v_is_plan_180day := (v_res.type = 'plan_180day_mixmaster');
  v_friend_code := v_res.friend_code;
  v_points_used := COALESCE(v_res.points_used, 0);

  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  IF v_points_used > 0 THEN
    PERFORM public.use_points(v_client_id, v_points_used, p_payment_id);
    
    SELECT fcu.id, fc.created_by
    INTO v_referee_code_use_id, v_referrer_user_id
    FROM public.friend_code_uses fcu
    JOIN public.friend_codes fc ON fc.code = fcu.code
    WHERE fcu.used_by = v_client_id
    AND fcu.used_in_payment = false
    LIMIT 1;

    IF v_referee_code_use_id IS NOT NULL AND v_referrer_user_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.referral_rewards 
        WHERE created_from_friend_code_use_id = v_referee_code_use_id
      ) INTO v_reward_already_given;

      IF NOT v_reward_already_given THEN
        INSERT INTO public.point_transactions (
          user_id, amount, transaction_type, notes, friend_code_use_id
        ) VALUES (
          v_referrer_user_id, 5000, 'referral_earned',
          'Recompensa por convite - amigo utilizou 💎', v_referee_code_use_id
        );

        UPDATE public.profiles 
        SET points_balance = points_balance + 5000 
        WHERE id = v_referrer_user_id;

        UPDATE public.friend_code_uses
        SET used_in_payment = true, payment_request_id = p_payment_id
        WHERE id = v_referee_code_use_id;

        INSERT INTO public.referral_rewards (
          user_id, points_amount, discount_percent, expires_at, is_used, created_from_friend_code_use_id
        ) VALUES (
          v_referrer_user_id, 5000, 25, now() + interval '30 days', false, v_referee_code_use_id
        );

        SELECT full_name INTO v_referrer_name FROM public.profiles WHERE id = v_referrer_user_id;

        INSERT INTO public.notifications (user_id, role, title, body)
        VALUES (
          v_referrer_user_id, 'user', '💎 Recebeste 5000💎!',
          'O teu amigo ' || COALESCE(v_client_name, 'um utilizador') || ' utilizou 💎 numa reserva! Recebeste 5000💎 como recompensa.'
        );
      END IF;
    END IF;
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
      v_client_id, 'user', 'Reserva confirmada!', 'A tua reserva foi aprovada e confirmada!'
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
    
    if v_is_mixmaster AND NOT v_is_loyalty_offer AND NOT v_is_plan_180day then
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

    -- Mark 180-day offer as claimed on admin approval
    IF v_is_plan_180day THEN
      UPDATE public.plan_180day_offers
      SET is_claimed = true, claimed_at = NOW()
      WHERE user_id = v_client_id AND is_claimed = false;
    END IF;

    if exists (select 1 from public.bookings where id = v_booking_id and starts_at is not null) then
      select starts_at, ends_at + interval '1 hour'
      into v_new_start, v_new_end
      from public.bookings where id = v_booking_id;

      v_merged_start := v_new_start;
      v_merged_end := v_new_end;

      SELECT LEAST(v_merged_start, MIN(starts_at)), GREATEST(v_merged_end, MAX(ends_at))
      INTO v_merged_start, v_merged_end
      FROM public.unavailable_slots
      WHERE tstzrange(starts_at, ends_at) && tstzrange(v_new_start, v_new_end);

      DELETE FROM public.unavailable_slots
      WHERE tstzrange(starts_at, ends_at) && tstzrange(v_merged_start, v_merged_end);

      INSERT INTO public.unavailable_slots (starts_at, ends_at, reason)
      VALUES (v_merged_start, v_merged_end, 'Sessão + 1h descanso');
    end if;

    delete from public.reservations where id = v_res.reservation_id;
    return v_booking_id;
  end if;
end;
$$;

-- 4. Update abandon_offer to also clean up plan_180day_offers for 180-day reservations
CREATE OR REPLACE FUNCTION public.abandon_offer(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res_record RECORD;
  v_current_month date;
BEGIN
  SELECT * INTO v_res_record 
  FROM public.reservations 
  WHERE id = p_reservation_id 
  FOR UPDATE;
  
  IF v_res_record.id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;
  
  -- Mark reservation as abandoned
  UPDATE public.reservations
  SET status = 'abandoned'
  WHERE id = p_reservation_id;
  
  -- If it's a 180-day offer reservation (no offer_id but has the snapshot name pattern)
  IF v_res_record.service_name_snapshot ILIKE '%Oferta Plano%180 dias%' THEN
    -- Reset the plan_180day_offers record so user can claim again
    DELETE FROM public.plan_180day_offers
    WHERE user_id = v_res_record.user_id AND is_claimed = false;
    
    RETURN true;
  END IF;
  
  -- Regular offer flow
  IF v_res_record.offer_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não tem oferta associada';
  END IF;
  
  v_current_month := date_trunc('month', v_res_record.created_at);
  
  UPDATE public.user_offers
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE user_id = v_res_record.user_id 
    AND offer_id = v_res_record.offer_id 
    AND month_year = v_current_month;
  
  DELETE FROM public.user_offers
  WHERE user_id = v_res_record.user_id 
    AND offer_id = v_res_record.offer_id 
    AND month_year = v_current_month
    AND used_count = 0;
  
  RETURN true;
END;
$$;
