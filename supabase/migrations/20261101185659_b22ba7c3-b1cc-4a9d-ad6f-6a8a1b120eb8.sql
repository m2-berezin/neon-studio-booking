-- =====================================================================
-- 1. Reschedule requests
--    With 48h+ notice the client asks for a new time for free and the
--    admin accepts or declines. With less notice the client goes through
--    the normal payment flow again (see reservations.reschedule_of_booking_id).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_starts_at timestamptz NOT NULL,
  new_ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reschedule_requests_status_idx ON public.reschedule_requests (status, created_at);

GRANT SELECT ON public.reschedule_requests TO authenticated;
GRANT ALL ON public.reschedule_requests TO service_role;

ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view their reschedule requests, admins view all" ON public.reschedule_requests;
CREATE POLICY "Clients view their reschedule requests, admins view all"
  ON public.reschedule_requests FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Which booking a paid (under 48h) reschedule replaces
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reschedule_of_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

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
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id AND user_id = auth.uid();

  IF v_booking.id IS NULL OR v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;

  IF v_booking.starts_at < now() + interval '48 hours' THEN
    RAISE EXCEPTION 'O reagendamento gratuito só é possível até 48 horas antes da sessão';
  END IF;

  IF p_new_starts_at <= now() OR p_new_ends_at <= p_new_starts_at THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;

  IF EXISTS (SELECT 1 FROM reschedule_requests WHERE booking_id = p_booking_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Já tens um pedido de reagendamento pendente para esta sessão';
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.status = 'confirmed' AND b.id <> p_booking_id
      AND tstzrange(b.starts_at, b.ends_at) && tstzrange(p_new_starts_at, p_new_ends_at)
  ) THEN
    RAISE EXCEPTION 'Esse horário já está reservado';
  END IF;

  INSERT INTO reschedule_requests (booking_id, user_id, new_starts_at, new_ends_at)
  VALUES (p_booking_id, auth.uid(), p_new_starts_at, p_new_ends_at)
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

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.status = 'confirmed' AND b.id <> v_request.booking_id
      AND tstzrange(b.starts_at, b.ends_at) && tstzrange(v_request.new_starts_at, v_request.new_ends_at)
  ) THEN
    RAISE EXCEPTION 'Esse horário entretanto foi reservado por outro cliente';
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = v_request.booking_id;

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

GRANT EXECUTE ON FUNCTION public.request_reschedule(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_reschedule(uuid, boolean) TO authenticated;

-- =====================================================================
-- 2. Blocking a client's access
--    In its own table, because clients are allowed to edit their own
--    row in profiles and could otherwise unblock themselves.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.blocked_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by uuid,
  blocked_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients see their own block, admins see all" ON public.blocked_users;
CREATE POLICY "Clients see their own block, admins see all"
  ON public.blocked_users FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can block users';
  END IF;

  IF has_role(p_user_id, 'admin') THEN
    RAISE EXCEPTION 'Não é possível bloquear um administrador';
  END IF;

  IF p_blocked THEN
    INSERT INTO blocked_users (user_id, blocked_by)
    VALUES (p_user_id, auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM blocked_users WHERE user_id = p_user_id;
  END IF;

  -- Also stops new logins and session renewals at the server. If the database
  -- doesn't allow this, the app still blocks the user through blocked_users.
  BEGIN
    UPDATE auth.users
    SET banned_until = CASE WHEN p_blocked THEN 'infinity'::timestamptz ELSE NULL END
    WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not update auth.users.banned_until: %', SQLERRM;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;

-- =====================================================================
-- 3. First notification after subscribing or changing plan
--    Patched in place so the rest of admin_approve_payment stays exactly
--    as deployed. Fails loudly if the text is not there.
-- =====================================================================
DO $$
DECLARE
  v_definition text;
  v_old text := $old$values (v_client_id, 'user', 'Subscrição ativada!', 'A tua subscrição foi ativada por mais um mês!');$old$;
  v_new text := $new$values (v_client_id, 'user', 'Subscrição ativada!',
      CASE WHEN v_existing_subscription.id IS NOT NULL AND v_existing_subscription.plan_type = v_plan_type
        THEN 'A tua subscrição foi ativada por mais um mês!'
        ELSE 'O teu plano ' || v_plan_type || ' já se encontra ativo!'
      END);$new$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_approve_payment';

  IF position(v_new IN v_definition) > 0 THEN
    RETURN; -- Already applied
  END IF;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'admin_approve_payment: expected notification text not found';
  END IF;

  EXECUTE replace(v_definition, v_old, v_new);
END;
$$;