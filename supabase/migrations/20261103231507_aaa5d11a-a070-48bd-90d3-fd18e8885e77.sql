-- =====================================================================
-- 1. Reschedules
--    A Mix & Master booking has no date. An empty range counts as
--    "forever" in Postgres, so it clashed with every requested time.
--    Plan X reschedules free at any time, plan S once a month.
-- =====================================================================
ALTER TABLE public.reschedule_requests
  ADD COLUMN IF NOT EXISTS uses_plan_benefit boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.booking_time_is_taken(p_starts_at timestamptz, p_ends_at timestamptz, p_ignore_booking_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.status = 'confirmed'
      AND b.id <> p_ignore_booking_id
      AND b.starts_at IS NOT NULL
      AND b.ends_at IS NOT NULL
      AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, p_ends_at)
  );
$$;

CREATE OR REPLACE FUNCTION public.plan_allows_late_reschedule(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT plan_type FROM subscriptions WHERE user_id = p_user_id AND is_active = true LIMIT 1)
    WHEN 'X' THEN true
    WHEN 'S' THEN NOT EXISTS (
      SELECT 1 FROM reschedule_requests r
      WHERE r.user_id = p_user_id
        AND r.uses_plan_benefit
        AND r.status <> 'rejected'
        AND r.created_at > now() - interval '1 month'
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.request_reschedule(
  p_booking_id uuid,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_request_id uuid;
  v_client_name text;
  v_is_late boolean;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id AND user_id = auth.uid();

  IF v_booking.id IS NULL OR v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;

  IF v_booking.starts_at IS NULL THEN
    RAISE EXCEPTION 'Esta reserva não tem data para reagendar';
  END IF;

  v_is_late := v_booking.starts_at < now() + interval '48 hours';

  IF v_is_late AND NOT plan_allows_late_reschedule(auth.uid()) THEN
    RAISE EXCEPTION 'O reagendamento gratuito só é possível até 48 horas antes da sessão';
  END IF;

  IF p_new_starts_at IS NULL OR p_new_ends_at IS NULL
    OR p_new_starts_at <= now() OR p_new_ends_at <= p_new_starts_at THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;

  IF EXISTS (SELECT 1 FROM reschedule_requests WHERE booking_id = p_booking_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Já tens um pedido de reagendamento pendente para esta sessão';
  END IF;

  IF booking_time_is_taken(p_new_starts_at, p_new_ends_at, p_booking_id) THEN
    RAISE EXCEPTION 'Esse horário já está reservado';
  END IF;

  INSERT INTO reschedule_requests (booking_id, user_id, new_starts_at, new_ends_at, uses_plan_benefit)
  VALUES (p_booking_id, auth.uid(), p_new_starts_at, p_new_ends_at, v_is_late)
  RETURNING id INTO v_request_id;

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body)
  SELECT r.user_id, 'admin', 'Pedido de reagendamento',
    COALESCE(v_client_name, 'Um cliente') || ' pediu para reagendar para '
      || to_char(p_new_starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI') || '.'
  FROM user_roles r
  WHERE r.role = 'admin';

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_reschedule(p_request_id uuid, p_accept boolean)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_booking record;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can decide reschedule requests';
  END IF;

  SELECT * INTO v_request FROM reschedule_requests WHERE id = p_request_id AND status = 'pending';
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já decidido';
  END IF;

  IF NOT p_accept THEN
    UPDATE reschedule_requests
    SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
    WHERE id = p_request_id;

    INSERT INTO notifications (user_id, role, title, body)
    VALUES (v_request.user_id, 'user', 'Reagendamento recusado',
      'Essa data não é possível. A tua sessão mantém-se: reagenda para outra data em Projetos.');

    RETURN v_request.booking_id;
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = v_request.booking_id;

  IF v_booking.starts_at IS NULL THEN
    RAISE EXCEPTION 'Esta reserva não tem data para reagendar';
  END IF;

  IF booking_time_is_taken(v_request.new_starts_at, v_request.new_ends_at, v_request.booking_id) THEN
    RAISE EXCEPTION 'Esse horário entretanto foi reservado por outro cliente';
  END IF;

  -- Moving the booking keeps its payment and price attached to it
  UPDATE bookings
  SET starts_at = v_request.new_starts_at, ends_at = v_request.new_ends_at
  WHERE id = v_request.booking_id;

  -- These rows only colour occupied days in the calendar
  DELETE FROM unavailable_slots
  WHERE reason = 'Sessão + 1h descanso'
    AND tstzrange(starts_at, ends_at) && tstzrange(v_booking.starts_at, v_booking.ends_at);

  INSERT INTO unavailable_slots (starts_at, ends_at, reason)
  VALUES (v_request.new_starts_at, v_request.new_ends_at, 'Sessão + 1h descanso');

  UPDATE reschedule_requests
  SET status = 'approved', decided_by = auth.uid(), decided_at = now()
  WHERE id = p_request_id;

  INSERT INTO notifications (user_id, role, title, body)
  VALUES (v_request.user_id, 'user', 'Reagendamento confirmado',
    'A tua sessão passou para '
      || to_char(v_request.new_starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI') || '.');

  RETURN v_request.booking_id;
END;
$$;

-- The admin moves a session directly; the client is told and sees the new date
CREATE OR REPLACE FUNCTION public.admin_reschedule_booking(
  p_booking_id uuid,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can reschedule bookings';
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF v_booking.id IS NULL OR v_booking.starts_at IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;

  IF p_new_starts_at IS NULL OR p_new_ends_at IS NULL OR p_new_ends_at <= p_new_starts_at THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;

  IF booking_time_is_taken(p_new_starts_at, p_new_ends_at, p_booking_id) THEN
    RAISE EXCEPTION 'Esse horário já está reservado';
  END IF;

  UPDATE bookings
  SET starts_at = p_new_starts_at, ends_at = p_new_ends_at
  WHERE id = p_booking_id;

  DELETE FROM unavailable_slots
  WHERE reason = 'Sessão + 1h descanso'
    AND tstzrange(starts_at, ends_at) && tstzrange(v_booking.starts_at, v_booking.ends_at);

  INSERT INTO unavailable_slots (starts_at, ends_at, reason)
  VALUES (p_new_starts_at, p_new_ends_at, 'Sessão + 1h descanso');

  -- Any request the client had pending is replaced by this new date
  UPDATE reschedule_requests
  SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
  WHERE booking_id = p_booking_id AND status = 'pending';

  INSERT INTO notifications (user_id, role, title, body, link)
  VALUES (v_booking.user_id, 'user', 'Sessão reagendada',
    'A tua sessão foi reagendada para dia '
      || to_char(p_new_starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI') || '.',
    '/projects');

  RETURN p_booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.booking_time_is_taken(timestamptz, timestamptz, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.plan_allows_late_reschedule(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reschedule_booking(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_time_is_taken(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_allows_late_reschedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reschedule_booking(uuid, timestamptz, timestamptz) TO authenticated;

-- =====================================================================
-- 2. Reading a chat
--    A client only has one conversation, so opening it clears everything
--    addressed to them, including anything sent under another thread.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.mark_chat_read(p_other_user_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE messages
  SET is_read = true
  WHERE receiver_id = auth.uid()
    AND is_read = false
    AND (sender_id = p_other_user_id OR NOT is_admin());
$$;

-- =====================================================================
-- 3. Mix & Master
--    Sending a project never depends on the automatic acceptance. If it
--    fails, the project still goes through, its payment waits in the
--    admin's Payments, and the reason is kept on the project.
-- =====================================================================
ALTER TABLE public.mixmaster_projects
  ADD COLUMN IF NOT EXISTS auto_accept_error text;

CREATE OR REPLACE FUNCTION public.submit_mixmaster_project(
  p_payment_id uuid,
  p_title text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_project_id uuid;
  v_title text := COALESCE(NULLIF(trim(p_title), ''), 'Mix & Master');
  v_client_name text;
  v_accept_error text;
BEGIN
  SELECT pr.id, pr.user_id, r.starts_at, r.service_name_snapshot
  INTO v_request
  FROM payment_requests pr
  JOIN reservations r ON r.id = pr.reservation_id
  WHERE pr.id = p_payment_id AND pr.user_id = auth.uid() AND pr.status = 'pending';

  -- Studio sessions have a date and must still be accepted by the admin
  IF v_request.id IS NULL OR v_request.starts_at IS NOT NULL
    OR v_request.service_name_snapshot NOT ILIKE '%mix%master%' THEN
    RAISE EXCEPTION 'Pedido de Mix & Master não encontrado';
  END IF;

  BEGIN
    PERFORM set_config('app.mixmaster_auto_approve', p_payment_id::text, true);
    PERFORM admin_approve_payment(p_payment_id);

    UPDATE payment_requests SET decided_by = NULL WHERE id = p_payment_id;

    -- That text is meant for sessions; the client already sees the project
    DELETE FROM notifications
    WHERE user_id = auth.uid() AND title = 'Reserva confirmada!' AND created_at >= now() - interval '1 second';

    PERFORM award_points(auth.uid(), 1000, 'service_reward');
  EXCEPTION WHEN OTHERS THEN
    v_accept_error := SQLERRM;
    RAISE WARNING 'submit_mixmaster_project: automatic acceptance failed: %', SQLERRM;
  END;

  PERFORM set_config('app.mixmaster_auto_approve', '', true);

  INSERT INTO mixmaster_projects (client_id, title, payment_request_id, auto_accept_error)
  VALUES (auth.uid(), v_title, p_payment_id, v_accept_error)
  RETURNING id INTO v_project_id;

  INSERT INTO mixmaster_steps (project_id, kind, author_id, link, note)
  VALUES (v_project_id, 'submission', auth.uid(), NULLIF(trim(p_link), ''), NULLIF(trim(p_note), ''));

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT r.user_id, 'admin', 'Novo Mix & Master',
    COALESCE(v_client_name, 'Um cliente') || ' enviou "' || v_title || '".',
    '/admin/projects/' || v_project_id
  FROM user_roles r
  WHERE r.role = 'admin';

  RETURN v_project_id;
END;
$$;

-- =====================================================================
-- 4. Invite diamonds last 30 days from the friend's sign-up, for both
--    people. Booking any service within that time keeps them for good.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.friend_code_deadline(p_friend_code_use_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.created_at + interval '30 days'
  FROM friend_code_uses fcu
  JOIN profiles p ON p.id = fcu.used_by
  WHERE fcu.id = p_friend_code_use_id;
$$;

REVOKE EXECUTE ON FUNCTION public.friend_code_deadline(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_definition text;
  v_insert text := $old$user_id,\s*amount,\s*transaction_type,\s*notes,\s*friend_code_use_id\s*\)\s*VALUES\s*\(\s*v_referrer_user_id,\s*5000,\s*'referral_earned',\s*'Recompensa por convite - amigo utilizou 💎',\s*v_referee_code_use_id\s*\)$old$;
  v_insert_new text := $new$user_id, amount, transaction_type, notes, friend_code_use_id, expires_at
        ) VALUES (
          v_referrer_user_id, 5000, 'referral_earned',
          'Recompensa por convite - amigo utilizou 💎', v_referee_code_use_id,
          public.friend_code_deadline(v_referee_code_use_id)
        )$new$;
  v_reward_check text := 'IF\s+NOT\s+v_reward_already_given\s+THEN';
  v_reward_expiry text := $old$now\(\)\s*\+\s*interval\s*'30 days',\s*false,\s*v_referee_code_use_id$old$;
  v_referrer_select text := 'SELECT\s+fcu\.id,\s*fc\.created_by';
  v_referrer_join text := 'JOIN\s+public\.friend_codes\s+fc\s+ON\s+fc\.code\s*=\s*fcu\.code';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_approve_payment';

  IF position('friend_code_deadline' IN v_definition) > 0 THEN
    RETURN; -- Already applied
  END IF;

  IF v_definition !~ v_insert OR v_definition !~ v_reward_check OR v_definition !~ v_reward_expiry
    OR v_definition !~ v_referrer_select OR v_definition !~ v_referrer_join THEN
    RAISE EXCEPTION 'admin_approve_payment: expected referral reward not found';
  END IF;

  -- Codes are created in referral_codes; friend_codes only holds the oldest ones
  v_definition := regexp_replace(v_definition, v_referrer_select, 'SELECT fcu.id, COALESCE(rc.user_id, fc.created_by)');
  v_definition := regexp_replace(v_definition, v_referrer_join,
    'LEFT JOIN public.referral_codes rc ON rc.code = fcu.code LEFT JOIN public.friend_codes fc ON fc.code = fcu.code');
  v_definition := regexp_replace(v_definition, v_insert, v_insert_new);
  -- Once the friend's 30 days are over the reward would already be expired, so it isn't given
  v_definition := regexp_replace(v_definition, v_reward_check,
    'IF NOT v_reward_already_given AND now() < public.friend_code_deadline(v_referee_code_use_id) THEN');
  v_definition := regexp_replace(v_definition, v_reward_expiry,
    'public.friend_code_deadline(v_referee_code_use_id), false, v_referee_code_use_id');
  -- The balance follows the transactions, so it can't count the reward twice
  v_definition := regexp_replace(v_definition, 'SET\s+points_balance\s*=\s*points_balance\s*\+\s*5000',
    'SET points_balance = public.get_available_points(v_referrer_user_id)');

  EXECUTE v_definition;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_friend_code_with_points(p_user_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code_owner_id uuid;
  v_existing_use record;
  v_friend_code_use_id uuid;
  v_deadline timestamptz;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sessão inválida');
  END IF;

  SELECT user_id INTO v_code_owner_id
  FROM public.referral_codes
  WHERE code = p_code AND is_active = true
  LIMIT 1;

  IF v_code_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou inativo');
  END IF;

  IF v_code_owner_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não podes usar o teu próprio código');
  END IF;

  SELECT * INTO v_existing_use
  FROM public.friend_code_uses
  WHERE used_by = p_user_id
  LIMIT 1;

  IF v_existing_use.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já usaste um código de amigo anteriormente');
  END IF;

  SELECT created_at + interval '30 days' INTO v_deadline FROM public.profiles WHERE id = p_user_id;

  IF v_deadline IS NULL OR now() >= v_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'O código de amigo só pode ser usado nos primeiros 30 dias de conta');
  END IF;

  INSERT INTO public.friend_code_uses (code, used_by, used_in_payment)
  VALUES (p_code, p_user_id, false)
  RETURNING id INTO v_friend_code_use_id;

  PERFORM public.award_points(
    p_user_id,
    5000,
    'referral_used',
    v_deadline,
    v_friend_code_use_id,
    NULL
  );

  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    p_user_id,
    'user',
    'Ganhaste 5000 Pontos!',
    'Código de amigo aplicado! Tens até ' || to_char(v_deadline AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY') || ' para usar os pontos.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', 5000,
    'expires_in_days', CEIL(EXTRACT(EPOCH FROM (v_deadline - now())) / 86400)::integer
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_friend_code_with_points(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_friend_code_with_points(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.keep_referral_points_after_booking()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved'
    AND NEW.type IS DISTINCT FROM 'subscription_request' THEN
    UPDATE point_transactions
    SET expires_at = NULL
    WHERE user_id = NEW.user_id
      AND transaction_type IN ('referral_used', 'referral_earned')
      AND expires_at > now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_referral_points_after_booking ON public.payment_requests;
CREATE TRIGGER keep_referral_points_after_booking
  AFTER UPDATE OF status ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.keep_referral_points_after_booking();

-- =====================================================================
-- 5. Welcome voucher: 10€, once, within the first 60 days of the account.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_voucher_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_claimed boolean;
BEGIN
  SELECT created_at + interval '60 days' INTO v_deadline FROM profiles WHERE id = p_user_id;

  SELECT EXISTS (SELECT 1 FROM vouchers WHERE client_id = p_user_id AND code LIKE 'VOUCHER%') INTO v_claimed;

  RETURN jsonb_build_object(
    'available', NOT v_claimed AND now() < v_deadline,
    'claimed', v_claimed,
    'days_left', GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_deadline - now())) / 86400))::integer
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_voucher(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher_id uuid;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Voucher indisponível';
  END IF;

  IF NOT (get_voucher_status(p_user_id)->>'available')::boolean THEN
    RAISE EXCEPTION 'O voucher só pode ser reivindicado uma vez, nos primeiros 60 dias de conta.';
  END IF;

  INSERT INTO vouchers (client_id, amount_eur, code, expires_at)
  SELECT p_user_id, 10.00, 'VOUCHER10-' || gen_random_uuid()::text, created_at + interval '60 days'
  FROM profiles WHERE id = p_user_id
  RETURNING id INTO v_voucher_id;

  UPDATE profiles SET last_voucher_at = now() WHERE id = p_user_id;

  RETURN v_voucher_id;
END;
$$;

-- Unused vouchers claimed before follow the same rule: 10€, until 60 days after the account was created
UPDATE public.vouchers v
SET amount_eur = 10,
    expires_at = p.created_at + interval '60 days'
FROM public.profiles p
WHERE p.id = v.client_id AND v.is_used = false AND v.code LIKE 'VOUCHER%';

-- The welcome voucher is for studio sessions, at their normal price, without diamonds
CREATE OR REPLACE FUNCTION public.check_welcome_voucher_rules()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vouchers v WHERE v.id = NEW.voucher_id AND v.code LIKE 'VOUCHER%') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.points_used, 0) > 0 THEN
    RAISE EXCEPTION 'Não é possível usar diamantes nesta oferta.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.id = NEW.reservation_id AND r.starts_at IS NOT NULL AND r.offer_id IS NULL
  ) THEN
    RAISE EXCEPTION 'O voucher só é válido em sessões de Captação ou Captação 3h + Mix & Master.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_welcome_voucher_rules ON public.payment_requests;
CREATE TRIGGER check_welcome_voucher_rules
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_welcome_voucher_rules();

-- =====================================================================
-- 6. Offers: 3h for the price of 2h once every 2 months, 1h free per
--    month on plan X.
-- =====================================================================
UPDATE public.offers
SET limit_per_month = 1
WHERE name NOT ILIKE '%PREMIUM+%' AND duration_free_min = 60;

UPDATE public.offers
SET name = 'Oferta 1h de Captação por Mês PREMIUM+',
    description = 'Exclusivo para assinantes Plano X - 1h de captação totalmente grátis uma vez por mês',
    duration_free_min = 60
WHERE name ILIKE '%PREMIUM+%';

-- An offer's own duration wins over the service it's booked under
CREATE OR REPLACE FUNCTION public.reservations_fill_from_service()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
declare svc record;
begin
  select name, duration_minutes, price_eur, currency
    into svc
  from public.services
  where id = new.service_id;

  if svc.duration_minutes is null or svc.duration_minutes <= 0 then
    raise exception 'Servico % sem duration_minutes valido', new.service_id;
  end if;

  -- calcular fim
  new.ends_at := new.starts_at + make_interval(mins => coalesce(new.duration_minutes_snapshot, svc.duration_minutes));

  -- snapshots: only fill if not already set (offers may pre-set these)
  new.service_name_snapshot     := coalesce(new.service_name_snapshot, svc.name);
  new.duration_minutes_snapshot := coalesce(new.duration_minutes_snapshot, svc.duration_minutes);
  new.price_eur_snapshot        := coalesce(new.price_eur_snapshot, svc.price_eur);
  new.currency_snapshot         := coalesce(new.currency_snapshot, svc.currency, 'EUR');

  return new;
end;
$$;

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
  v_offer record;
  v_service record;
  v_reservation_id uuid;
  v_service_name_snapshot text;
  v_price_eur_snapshot numeric;
  v_duration_snapshot integer;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Oferta indisponível';
  END IF;

  SELECT o.id, o.name, o.price_eur, o.is_active, o.limit_per_month
  INTO v_offer
  FROM public.offers o
  WHERE o.id = p_offer_id AND o.is_active = true;

  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION 'Oferta não encontrada ou inativa';
  END IF;

  IF v_offer.name ILIKE '%PREMIUM+%' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = p_user_id AND is_active = true AND plan_type = 'X'
    ) THEN
      RAISE EXCEPTION 'Esta oferta é exclusiva do Plano X';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.user_offers u
      WHERE u.user_id = p_user_id
        AND u.offer_id = p_offer_id
        AND u.month_year::date = date_trunc('month', now())::date
        AND u.used_count >= v_offer.limit_per_month
    ) THEN
      RAISE EXCEPTION 'Já usaste esta oferta este mês';
    END IF;

    -- Plan X: 1h free, booked under the shortest recording service
    SELECT s.* INTO v_service
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE c.slug = 'capta-o'
      AND s.duration_minutes = 120
      AND s.is_active = true
    ORDER BY s.sort_order
    LIMIT 1;

    v_service_name_snapshot := 'Captação 1h PREMIUM+';
    v_price_eur_snapshot := 0;
    v_duration_snapshot := 60;
  ELSE
    -- Used this month or last month: not available again yet
    IF EXISTS (
      SELECT 1 FROM public.user_offers u
      WHERE u.user_id = p_user_id
        AND u.offer_id = p_offer_id
        AND u.used_count > 0
        AND u.month_year::date >= (date_trunc('month', now()) - interval '1 month')::date
    ) THEN
      RAISE EXCEPTION 'Esta oferta só pode ser usada de 2 em 2 meses';
    END IF;

    SELECT s.* INTO v_service
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE c.slug = 'capta-o'
      AND s.duration_minutes = 180
      AND s.is_active = true
    ORDER BY s.sort_order
    LIMIT 1;

    v_service_name_snapshot := v_service.name || ' (Oferta)';
    v_price_eur_snapshot := v_offer.price_eur;
    v_duration_snapshot := v_service.duration_minutes;
  END IF;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado para esta oferta';
  END IF;

  INSERT INTO public.reservations (
    user_id, service_id, starts_at, offer_id, status,
    service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot
  )
  VALUES (
    p_user_id, v_service.id, p_starts_at, p_offer_id, 'pending',
    v_service_name_snapshot, v_price_eur_snapshot, v_duration_snapshot, 'EUR'
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_offer(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_offer(uuid, uuid, timestamptz) TO authenticated;

-- =====================================================================
-- 7. What each plan saved the client, recorded as each service is
--    accepted, so it stays correct after changing plan.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.subscription_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('S', 'X')),
  payment_request_id uuid UNIQUE REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  service_name text,
  full_price_eur numeric NOT NULL,
  discount_percent numeric NOT NULL,
  saved_eur numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_savings_user_idx ON public.subscription_savings (user_id, created_at DESC);

GRANT SELECT ON public.subscription_savings TO authenticated;
GRANT ALL ON public.subscription_savings TO service_role;

ALTER TABLE public.subscription_savings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view their savings, admins view all" ON public.subscription_savings;
CREATE POLICY "Clients view their savings, admins view all"
  ON public.subscription_savings FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.record_subscription_savings()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_reservation record;
  v_percent numeric;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status IS NOT DISTINCT FROM 'approved'
    OR NEW.type IS DISTINCT FROM 'reservation' OR NEW.reservation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plan_type INTO v_plan FROM subscriptions WHERE user_id = NEW.user_id AND is_active = true LIMIT 1;
  IF v_plan IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT price_eur_snapshot, service_name_snapshot, offer_id INTO v_reservation
  FROM reservations WHERE id = NEW.reservation_id;

  -- Offers have their own price, and the welcome voucher replaces the plan's discount
  IF v_reservation.price_eur_snapshot IS NULL OR v_reservation.offer_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM vouchers v WHERE v.id = NEW.voucher_id AND v.code LIKE 'VOUCHER%') THEN
    RETURN NEW;
  END IF;

  v_percent := CASE v_plan WHEN 'S' THEN 10 ELSE 15 END;
  IF v_plan = 'X' AND v_reservation.service_name_snapshot ILIKE '%mix%' THEN
    v_percent := v_percent + 5;
  END IF;

  INSERT INTO subscription_savings (user_id, plan_type, payment_request_id, service_name, full_price_eur, discount_percent, saved_eur)
  VALUES (
    NEW.user_id, v_plan, NEW.id, v_reservation.service_name_snapshot, v_reservation.price_eur_snapshot, v_percent,
    round(v_reservation.price_eur_snapshot * v_percent / 100, 2)
  )
  ON CONFLICT (payment_request_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_subscription_savings ON public.payment_requests;
CREATE TRIGGER record_subscription_savings
  AFTER UPDATE OF status ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.record_subscription_savings();

-- =====================================================================
-- 8. Cancelling a subscription: benefits stay until the paid period ends
-- =====================================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription record;
  v_client_name text;
  v_end_date timestamptz;
BEGIN
  SELECT * INTO v_subscription FROM subscriptions WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_subscription.id IS NULL THEN
    RAISE EXCEPTION 'Não tens nenhuma subscrição ativa';
  END IF;

  v_end_date := v_subscription.end_date;

  -- No end date on record: plans are monthly, so the paid period runs to the next monthly date
  IF v_end_date IS NULL THEN
    v_end_date := v_subscription.start_date;
    WHILE v_end_date <= now() LOOP
      v_end_date := v_end_date + interval '1 month';
    END LOOP;
  END IF;

  UPDATE subscriptions
  SET cancel_at_period_end = true,
      canceled_at = now(),
      end_date = v_end_date
  WHERE id = v_subscription.id;

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body)
  SELECT r.user_id, 'admin', 'Subscrição cancelada',
    COALESCE(v_client_name, 'Um cliente') || ' cancelou o Plano ' || v_subscription.plan_type || '. Termina a '
      || to_char(v_end_date AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY') || '.'
  FROM user_roles r
  WHERE r.role = 'admin';

  RETURN v_end_date;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_my_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_subscription() TO authenticated;

-- =====================================================================
-- 9. Run with the booking reminders: ends cancelled subscriptions and
--    takes back invite diamonds that weren't used in time.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.run_scheduled_expirations()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE subscriptions
  SET is_active = false
  WHERE is_active = true AND cancel_at_period_end = true AND end_date <= now();

  FOR v_user_id IN
    WITH expired AS (
      UPDATE point_transactions
      SET is_expired = true
      WHERE transaction_type IN ('referral_used', 'referral_earned')
        AND is_expired = false
        AND expires_at <= now()
      RETURNING user_id
    )
    SELECT DISTINCT user_id FROM expired
  LOOP
    UPDATE profiles
    SET points_balance = GREATEST(0, get_available_points(v_user_id))
    WHERE id = v_user_id;

    INSERT INTO notifications (user_id, role, title, body)
    VALUES (v_user_id, 'user', 'Os teus diamantes expiraram',
      'Passaram 30 dias sem reservares nenhum serviço, por isso os 5000💎 do convite foram retirados.');
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_expirations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_expirations() TO service_role;