-- =====================================================================
-- 1. The client's Instagram, shown to the admin
-- =====================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram text;

-- =====================================================================
-- 2. Plan X's extra 5% is for Mix & Master alone, not Captação + Mix & Master.
--    Exclusive beats have a fixed deposit, so nothing was saved on them.
-- =====================================================================
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
    OR v_reservation.service_name_snapshot ILIKE '%beat%'
    OR EXISTS (SELECT 1 FROM vouchers v WHERE v.id = NEW.voucher_id AND v.code LIKE 'VOUCHER%') THEN
    RETURN NEW;
  END IF;

  v_percent := CASE v_plan WHEN 'S' THEN 10 ELSE 15 END;
  IF v_plan = 'X' AND v_reservation.service_name_snapshot ILIKE '%mix%'
    AND v_reservation.service_name_snapshot NOT ILIKE '%capta%' THEN
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

-- =====================================================================
-- 3. Projects: exclusive beats work like Mix & Master. Revisions depend on
--    the client's plan: 5 without one, 7 on plan S, unlimited on plan X.
-- =====================================================================
ALTER TABLE public.mixmaster_projects
  ADD COLUMN IF NOT EXISTS service text NOT NULL DEFAULT 'mixmaster' CHECK (service IN ('mixmaster', 'exclusive_beat')),
  ADD COLUMN IF NOT EXISTS brief jsonb;

-- NULL means unlimited
CREATE OR REPLACE FUNCTION public.project_revision_limit(p_service text, p_client_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_service = 'exclusive_beat' THEN 10
    ELSE CASE (SELECT plan_type FROM subscriptions WHERE user_id = p_client_id AND is_active = true LIMIT 1)
      WHEN 'X' THEN NULL
      WHEN 'S' THEN 7
      ELSE 5
    END
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.project_revision_limit(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mixmaster_add_step(
  p_project_id uuid,
  p_kind text,
  p_link text DEFAULT NULL,
  p_file_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_step_id uuid;
  v_versions integer;
  v_version integer;
  v_limit integer;
  v_link text := NULLIF(trim(p_link), '');
  v_note text := NULLIF(trim(p_note), '');
  v_client_name text;
  v_is_beat boolean;
BEGIN
  SELECT * INTO v_project FROM mixmaster_projects WHERE id = p_project_id;
  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  v_is_beat := v_project.service = 'exclusive_beat';
  v_limit := project_revision_limit(v_project.service, v_project.client_id);

  SELECT count(*) INTO v_versions FROM mixmaster_steps WHERE project_id = p_project_id AND kind = 'mix';

  IF is_admin() THEN
    IF p_kind NOT IN ('mix', 'master') THEN
      RAISE EXCEPTION 'Tipo de envio inválido';
    END IF;
    IF v_link IS NULL AND p_file_path IS NULL THEN
      RAISE EXCEPTION 'Junta um ficheiro ou um link';
    END IF;
    IF p_kind = 'mix' THEN
      IF v_limit IS NOT NULL AND v_versions >= v_limit THEN
        RAISE EXCEPTION 'As % versões incluídas já foram enviadas. Envia a versão final.', v_limit;
      END IF;
      v_version := v_versions + 1;
    END IF;
  ELSIF v_project.client_id = auth.uid() THEN
    IF p_kind <> 'feedback' THEN
      RAISE EXCEPTION 'Tipo de envio inválido';
    END IF;
    IF v_note IS NULL THEN
      RAISE EXCEPTION 'Escreve as tuas notas';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM mixmaster_steps WHERE project_id = p_project_id AND kind IN ('mix', 'master')) THEN
      RAISE EXCEPTION 'Ainda não há nenhuma versão para comentar';
    END IF;
    IF v_limit IS NOT NULL AND v_versions >= v_limit THEN
      RAISE EXCEPTION 'Já usaste as % versões incluídas. Fala com o Ghost no chat.', v_limit;
    END IF;
  ELSE
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  INSERT INTO mixmaster_steps (project_id, kind, author_id, version, link, file_path, file_name, note)
  VALUES (p_project_id, p_kind, auth.uid(), v_version, v_link, p_file_path, p_file_name, v_note)
  RETURNING id INTO v_step_id;

  UPDATE mixmaster_projects
  SET updated_at = now(),
      status = CASE WHEN p_kind = 'master' THEN 'completed' ELSE 'in_progress' END
  WHERE id = p_project_id;

  IF p_kind = 'feedback' THEN
    SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

    INSERT INTO notifications (user_id, role, title, body, link)
    SELECT r.user_id, 'admin', CASE WHEN v_is_beat THEN 'Notas no Beat Exclusivo' ELSE 'Notas no Mix & Master' END,
      COALESCE(v_client_name, 'Um cliente') || ' deixou notas em "' || v_project.title || '".',
      '/admin/projects/' || p_project_id
    FROM user_roles r
    WHERE r.role = 'admin';
  ELSE
    INSERT INTO notifications (user_id, role, title, body, link)
    VALUES (
      v_project.client_id, 'user',
      CASE
        WHEN p_kind = 'master' AND v_is_beat THEN 'O teu Beat está pronto'
        WHEN p_kind = 'master' THEN 'O teu Master está pronto'
        WHEN v_is_beat THEN 'Nova versão do teu Beat'
        ELSE 'Nova versão do teu Mix'
      END,
      CASE
        WHEN p_kind = 'master' AND v_is_beat THEN 'A versão final de "' || v_project.title || '" já está disponível.'
        WHEN p_kind = 'master' THEN 'O Master de "' || v_project.title || '" já está disponível.'
        ELSE 'A versão ' || v_version || COALESCE('/' || v_limit, '') || ' de "' || v_project.title || '" já está disponível.'
      END,
      '/projects/' || p_project_id
    );
  END IF;

  RETURN v_step_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_studio_project(
  p_payment_id uuid,
  p_service text,
  p_title text,
  p_link text,
  p_note text,
  p_brief jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_project_id uuid;
  v_booking_id text;
  v_is_beat boolean := p_service = 'exclusive_beat';
  v_label text := CASE WHEN p_service = 'exclusive_beat' THEN 'Beat Exclusivo' ELSE 'Mix & Master' END;
  v_title text;
  v_client_name text;
  v_method_label text;
  v_accept_error text;
BEGIN
  v_title := COALESCE(NULLIF(trim(p_title), ''), v_label);

  SELECT pr.id, pr.user_id, pr.amount_eur, pr.payment_method, r.starts_at, r.service_name_snapshot
  INTO v_request
  FROM payment_requests pr
  JOIN reservations r ON r.id = pr.reservation_id
  WHERE pr.id = p_payment_id AND pr.user_id = auth.uid() AND pr.status = 'pending';

  -- Studio sessions have a date and must still be accepted by the admin
  IF v_request.id IS NULL OR v_request.starts_at IS NOT NULL
    OR v_request.service_name_snapshot NOT ILIKE (CASE WHEN v_is_beat THEN '%beat%' ELSE '%mix%master%' END) THEN
    RAISE EXCEPTION 'Pedido de % não encontrado', v_label;
  END IF;

  -- Created first, so nothing the acceptance does can leave the project without its payment
  INSERT INTO mixmaster_projects (client_id, title, payment_request_id, service, brief)
  VALUES (auth.uid(), v_title, p_payment_id, p_service, p_brief)
  RETURNING id INTO v_project_id;

  BEGIN
    PERFORM set_config('app.mixmaster_auto_approve', p_payment_id::text, true);
    v_booking_id := admin_approve_payment(p_payment_id);

    UPDATE payment_requests
    SET decided_by = NULL, hidden_from_admin = false
    WHERE id = p_payment_id;

    -- The booking holds the list price; billing should count what was paid after discounts
    UPDATE bookings SET price_eur_snapshot = v_request.amount_eur WHERE id::text = v_booking_id;

    -- That text is meant for sessions; the client already sees the project
    DELETE FROM notifications
    WHERE user_id = auth.uid() AND title = 'Reserva confirmada!' AND created_at >= now() - interval '1 second';

    IF NOT v_is_beat THEN
      PERFORM award_points(auth.uid(), 1000, 'service_reward');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_accept_error := SQLERRM;
    RAISE WARNING 'submit_studio_project: automatic acceptance failed: %', SQLERRM;
  END;

  PERFORM set_config('app.mixmaster_auto_approve', '', true);

  IF v_accept_error IS NOT NULL THEN
    UPDATE mixmaster_projects SET auto_accept_error = v_accept_error WHERE id = v_project_id;
  END IF;

  INSERT INTO mixmaster_steps (project_id, kind, author_id, link, note)
  VALUES (v_project_id, 'submission', auth.uid(), NULLIF(trim(p_link), ''), NULLIF(trim(p_note), ''));

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT r.user_id, 'admin', 'Novo ' || v_label,
    COALESCE(v_client_name, 'Um cliente') || ' enviou "' || v_title || '".',
    '/admin/projects/' || v_project_id
  FROM user_roles r
  WHERE r.role = 'admin';

  -- If the acceptance failed, the payment is waiting in Pending and nothing has been recorded yet
  IF v_accept_error IS NULL THEN
    v_method_label := CASE v_request.payment_method
      WHEN 'mbway' THEN 'MB Way'
      WHEN 'transferencia' THEN 'Transferência Bancária'
      WHEN 'revolut' THEN 'Revolut'
    END;

    INSERT INTO notifications (user_id, role, title, body, link)
    SELECT r.user_id, 'admin', 'Pagamento de ' || v_label,
      COALESCE(v_client_name, 'Um cliente') || CASE
        WHEN v_request.amount_eur > 0 THEN
          ' pagou ' || regexp_replace(to_char(v_request.amount_eur, 'FM999990.00'), '\.00$', '') || '€'
          || COALESCE(' por ' || v_method_label, '') || ' pelo ' || v_label || '.'
        ELSE ' usou uma oferta no ' || v_label || '.'
      END,
      '/admin/payments'
    FROM user_roles r
    WHERE r.role = 'admin';
  END IF;

  RETURN v_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_studio_project(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_mixmaster_project(
  p_payment_id uuid,
  p_title text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.submit_studio_project(p_payment_id, 'mixmaster', p_title, p_link, p_note, NULL);
$$;

-- The deposit is set here, not by the app. Inactive, so it isn't offered as a session.
INSERT INTO public.services (name, slug, duration_minutes, price_eur, currency, is_active)
SELECT 'Beat Exclusivo', 'beat-exclusivo', 60, 30, 'EUR', false
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE slug = 'beat-exclusivo');

CREATE OR REPLACE FUNCTION public.submit_exclusive_beat_project(
  p_title text,
  p_note text,
  p_brief jsonb,
  p_payment_method text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service record;
  v_reservation_id uuid;
  v_payment_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  SELECT * INTO v_service FROM services WHERE slug = 'beat-exclusivo';
  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado';
  END IF;

  INSERT INTO reservations (user_id, service_id, service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot, status)
  VALUES (auth.uid(), v_service.id, v_service.name, v_service.price_eur, v_service.duration_minutes, v_service.currency, 'pending')
  RETURNING id INTO v_reservation_id;

  INSERT INTO payment_requests (user_id, reservation_id, amount_eur, currency, type, status, note, payment_method)
  VALUES (auth.uid(), v_reservation_id, v_service.price_eur, v_service.currency, 'reservation', 'pending', NULLIF(trim(p_note), ''), p_payment_method)
  RETURNING id INTO v_payment_id;

  RETURN public.submit_studio_project(v_payment_id, 'exclusive_beat', p_title, NULL, p_note, p_brief);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_exclusive_beat_project(text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_exclusive_beat_project(text, text, jsonb, text) TO authenticated;

-- =====================================================================
-- 4. Beats the admin publishes for clients to listen to
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.beat_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beat_catalog TO authenticated;
GRANT ALL ON public.beat_catalog TO service_role;

ALTER TABLE public.beat_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users see published beats, admins see all" ON public.beat_catalog;
CREATE POLICY "Signed-in users see published beats, admins see all"
  ON public.beat_catalog FOR SELECT
  TO authenticated
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage beats" ON public.beat_catalog;
CREATE POLICY "Admins manage beats"
  ON public.beat_catalog FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage catalog files" ON storage.objects;
CREATE POLICY "Admins manage catalog files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'beat-catalog' AND public.is_admin())
  WITH CHECK (bucket_id = 'beat-catalog' AND public.is_admin());

DROP POLICY IF EXISTS "Signed-in users listen to catalog files" ON storage.objects;
CREATE POLICY "Signed-in users listen to catalog files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'beat-catalog' AND auth.uid() IS NOT NULL);

-- =====================================================================
-- 5. Problems reported from the help bubble
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.problem_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('notificacoes', 'pagamento', 'diamantes', 'subscricao', 'outro')),
  note text,
  screenshot_path text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.problem_reports TO authenticated;
GRANT ALL ON public.problem_reports TO service_role;

ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients see their reports, admins see all" ON public.problem_reports;
CREATE POLICY "Clients see their reports, admins see all"
  ON public.problem_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins resolve reports" ON public.problem_reports;
CREATE POLICY "Admins resolve reports"
  ON public.problem_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read problem screenshots" ON storage.objects;
CREATE POLICY "Admins read problem screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'problem-screenshots' AND public.is_admin());

DROP POLICY IF EXISTS "Clients add their problem screenshots" ON storage.objects;
CREATE POLICY "Clients add their problem screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'problem-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Clients read their problem screenshots" ON storage.objects;
CREATE POLICY "Clients read their problem screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'problem-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.report_problem(
  p_category text,
  p_note text DEFAULT NULL,
  p_screenshot_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note text := NULLIF(trim(p_note), '');
  v_report_id uuid;
  v_client_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  IF p_category = 'outro' AND v_note IS NULL THEN
    RAISE EXCEPTION 'Descreve o problema na nota';
  END IF;

  IF p_screenshot_path IS NOT NULL AND p_screenshot_path NOT LIKE auth.uid()::text || '/%' THEN
    RAISE EXCEPTION 'Screenshot inválido';
  END IF;

  INSERT INTO problem_reports (user_id, category, note, screenshot_path)
  VALUES (auth.uid(), p_category, v_note, p_screenshot_path)
  RETURNING id INTO v_report_id;

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT r.user_id, 'admin', 'Problema reportado',
    COALESCE(v_client_name, 'Um cliente') || ' reportou um problema: ' || CASE p_category
      WHEN 'notificacoes' THEN 'notificações'
      WHEN 'pagamento' THEN 'erro em pagamento'
      WHEN 'diamantes' THEN 'diamantes'
      WHEN 'subscricao' THEN 'subscrição'
      ELSE 'outro'
    END || '.',
    '/admin/problems'
  FROM user_roles r
  WHERE r.role = 'admin';

  RETURN v_report_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_problem(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_problem(text, text, text) TO authenticated;

-- =====================================================================
-- 6. A client can cancel or move a session request still waiting for the admin.
--    Changing the payment request is what updates the admin's screen live.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.client_cancel_pending_request(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation record;
  v_payment record;
  v_client_name text;
BEGIN
  SELECT * INTO v_reservation FROM reservations
  WHERE id = p_reservation_id AND user_id = auth.uid() AND status = 'pending';

  IF v_reservation.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  SELECT * INTO v_payment FROM payment_requests
  WHERE reservation_id = p_reservation_id AND status = 'pending'
  LIMIT 1;

  IF v_payment.voucher_id IS NOT NULL THEN
    UPDATE vouchers SET is_used = false WHERE id = v_payment.voucher_id;
  END IF;

  -- Takes the payment request with it
  DELETE FROM reservations WHERE id = p_reservation_id;

  IF v_payment.id IS NOT NULL THEN
    SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

    INSERT INTO notifications (user_id, role, title, body, link)
    SELECT r.user_id, 'admin', 'Pedido cancelado',
      COALESCE(v_client_name, 'Um cliente') || ' cancelou o pedido de ' || COALESCE(v_reservation.service_name_snapshot, 'sessão')
        || COALESCE(' de ' || to_char(v_reservation.starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI'), '')
        || '. Se já tinha pago, trata da devolução.',
      '/admin/payments'
    FROM user_roles r
    WHERE r.role = 'admin';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_reschedule_pending_request(
  p_reservation_id uuid,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation record;
  v_client_name text;
BEGIN
  SELECT * INTO v_reservation FROM reservations
  WHERE id = p_reservation_id AND user_id = auth.uid() AND status = 'pending';

  IF v_reservation.id IS NULL OR v_reservation.starts_at IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF p_new_starts_at IS NULL OR p_new_ends_at IS NULL
    OR p_new_starts_at <= now() OR p_new_ends_at <= p_new_starts_at THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;

  -- This request is not a booking yet, so there is no booking of its own to ignore
  IF booking_time_is_taken(p_new_starts_at, p_new_ends_at, gen_random_uuid()) THEN
    RAISE EXCEPTION 'Esse horário já está reservado';
  END IF;

  UPDATE reservations
  SET starts_at = p_new_starts_at, ends_at = p_new_ends_at
  WHERE id = p_reservation_id;

  UPDATE payment_requests SET updated_at = now()
  WHERE reservation_id = p_reservation_id AND status = 'pending';

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT r.user_id, 'admin', 'Pedido reagendado',
    COALESCE(v_client_name, 'Um cliente') || ' mudou o pedido de ' || COALESCE(v_reservation.service_name_snapshot, 'sessão')
      || ' para ' || to_char(p_new_starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI') || '.',
    '/admin/payments'
  FROM user_roles r
  WHERE r.role = 'admin';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.client_cancel_pending_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_reschedule_pending_request(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_cancel_pending_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_reschedule_pending_request(uuid, timestamptz, timestamptz) TO authenticated;

-- =====================================================================
-- 7. Who signed up with a client's invite code
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_client_referrals(p_client_id uuid)
RETURNS TABLE (user_id uuid, full_name text, used_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can see referrals';
  END IF;

  RETURN QUERY
  SELECT fcu.used_by, p.full_name, fcu.used_at
  FROM referral_codes rc
  JOIN friend_code_uses fcu ON fcu.code = rc.code
  LEFT JOIN profiles p ON p.id = fcu.used_by
  WHERE rc.user_id = p_client_id
  ORDER BY fcu.used_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_client_referrals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_client_referrals(uuid) TO authenticated;