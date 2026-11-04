-- =====================================================================
-- 1. Billing counts what a session really costs after discounts. What the
--    client still has to pay on the day is part of the same amount.
-- 2. Paying again extends a plan from where it ends, rather than from today.
-- =====================================================================
DO $$
DECLARE
  v_definition text;
  v_keep_request text := 'update\s+public\.payment_requests\s+set\s+reservation_id\s*=\s*null,\s*hidden_from_admin\s*=\s*true\s+where\s+id\s*=\s*p_payment_id\s*;';
  v_new_plan text := $old$values\s*\(\s*v_client_id,\s*v_plan_type,\s*v_res\.amount_eur,\s*now\(\)\s*\+\s*interval\s*'1 month',\s*'confirmed',\s*true\s*\)$old$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_approve_payment';

  IF position('price_eur_snapshot = v_res.amount_eur' IN v_definition) > 0 THEN
    RETURN; -- Already applied
  END IF;

  IF v_definition !~ v_keep_request OR v_definition !~ v_new_plan THEN
    RAISE EXCEPTION 'admin_approve_payment: expected text not found';
  END IF;

  v_definition := regexp_replace(v_definition, v_keep_request,
    'update public.bookings set price_eur_snapshot = v_res.amount_eur where id = v_booking_id;
    update public.payment_requests set reservation_id = null, hidden_from_admin = true where id = p_payment_id;');

  v_definition := regexp_replace(v_definition, v_new_plan,
    $new$values (v_client_id, v_plan_type, v_res.amount_eur,
      CASE WHEN v_existing_subscription.plan_type = v_plan_type AND v_existing_subscription.end_date > now()
        THEN v_existing_subscription.end_date ELSE now() END + interval '1 month',
      'confirmed', true)$new$);

  EXECUTE v_definition;
END;
$$;

-- Sessions accepted since payment records started being kept
UPDATE public.bookings b
SET price_eur_snapshot = pr.amount_eur
FROM public.payments pay
JOIN public.payment_requests pr ON pr.id = pay.payment_request_id
WHERE pay.booking_id = b.id
  AND pr.status = 'approved'
  AND pr.reservation_id IS NULL
  AND b.price_eur_snapshot IS DISTINCT FROM pr.amount_eur;

-- =====================================================================
-- 3. Payments are manual, so a plan ends with the period paid unless the
--    client pays again. Plans already past their date get a week to do it.
-- =====================================================================
UPDATE public.subscriptions
SET end_date = now() + interval '7 days'
WHERE is_active = true
  AND cancel_at_period_end = false
  AND (end_date IS NULL OR end_date <= now());

CREATE OR REPLACE FUNCTION public.run_scheduled_expirations()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT s.user_id, 'user', 'A tua subscrição está a terminar',
    'O teu Plano ' || s.plan_type || ' termina a ' || to_char(s.end_date AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY')
      || '. Para manteres as vantagens, renova em Subscrições.',
    '/subscriptions'
  FROM subscriptions s
  WHERE s.is_active = true
    AND s.cancel_at_period_end = false
    AND s.end_date > now()
    AND s.end_date <= now() + interval '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = s.user_id
        AND n.title = 'A tua subscrição está a terminar'
        AND n.created_at > now() - interval '20 days'
    );

  WITH ended AS (
    UPDATE subscriptions
    SET is_active = false
    WHERE is_active = true AND end_date <= now()
    RETURNING user_id, plan_type
  )
  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT user_id, 'user', 'A tua subscrição terminou',
    'O teu Plano ' || plan_type || ' terminou. Podes voltar a subscrever em Subscrições.',
    '/subscriptions'
  FROM ended;

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

-- =====================================================================
-- 4. The rest of an exclusive beat is paid before the final delivery, so
--    the admin records it. It counts in billing on the day it's recorded.
-- =====================================================================
ALTER TABLE public.mixmaster_projects
  ADD COLUMN IF NOT EXISTS final_payment_eur numeric,
  ADD COLUMN IF NOT EXISTS final_payment_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_record_project_final_payment(p_project_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_service record;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can record payments';
  END IF;

  SELECT * INTO v_project FROM mixmaster_projects WHERE id = p_project_id AND service = 'exclusive_beat';
  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  IF v_project.final_payment_at IS NOT NULL THEN
    RAISE EXCEPTION 'O pagamento final deste projeto já foi registado';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  SELECT * INTO v_service FROM services WHERE slug = 'beat-exclusivo';

  INSERT INTO bookings (user_id, service_id, service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot, status)
  VALUES (v_project.client_id, v_service.id, 'Beat Exclusivo (pagamento final)', p_amount, v_service.duration_minutes, v_service.currency, 'confirmed');

  UPDATE mixmaster_projects
  SET final_payment_eur = p_amount, final_payment_at = now(), updated_at = now()
  WHERE id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_record_project_final_payment(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_project_final_payment(uuid, numeric) TO authenticated;

-- =====================================================================
-- 5. Functions that accepted any user, or no user at all
-- =====================================================================
-- Not used by the app: only other server functions may call them, as their owner
DO $$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_user_role', 'validate_referral_on_signup', 'subscribe_payment_request', 'subscribe_request',
                         'insert_booking_buffer', 'backfill_welcome_messages')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
  END LOOP;
END;
$$;

-- Used by the app or the site, but only ever for the person signed in. Signing up runs with no user yet.
DO $$
DECLARE
  v_function record;
  v_definition text;
BEGIN
  FOR v_function IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('create_subscription_payment_request', 'generate_referral_code', 'claim_180day_offer', 'check_180day_offer_eligibility')
  LOOP
    v_definition := pg_get_functiondef(v_function.oid);

    IF position('Sessão inválida' IN v_definition) = 0 THEN
      EXECUTE regexp_replace(v_definition, '\mBEGIN\M',
        $new$BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;
$new$);
    END IF;

    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_function.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_function.oid::regprocedure);
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_definition text;
  v_guarded text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_client_mixmaster_projects';

  IF position('is_admin' IN v_definition) = 0 THEN
    v_guarded := regexp_replace(v_definition, '(\w+\.user_id\s*=\s*p_user_id)', '\1 AND (p_user_id = auth.uid() OR public.is_admin())', 'g');

    IF v_guarded = v_definition THEN
      RAISE EXCEPTION 'get_client_mixmaster_projects: expected text not found';
    END IF;

    EXECUTE v_guarded;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_client_mixmaster_projects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_mixmaster_projects(uuid) TO authenticated;