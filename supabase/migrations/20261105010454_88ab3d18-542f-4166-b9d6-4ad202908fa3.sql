-- =====================================================================
-- 1. The admin hears about every payment request waiting for a decision.
--    Session requests never notified anyone, and subscription requests
--    looked admins up in profiles.role instead of user_roles. Projects
--    without a date send their own notification once they're accepted.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_payment_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_title text;
  v_body text;
  v_reservation record;
BEGIN
  SELECT full_name INTO v_client_name FROM profiles WHERE id = NEW.user_id;
  v_client_name := COALESCE(v_client_name, 'Um cliente');

  IF NEW.type = 'subscription_request' THEN
    v_title := 'Novo pedido de subscrição';
    v_body := v_client_name || ' pediu o Plano ' || COALESCE(NEW.plan_type, '') || ' ('
      || regexp_replace(to_char(NEW.amount_eur, 'FM999990.00'), '\.00$', '') || '€). Confirma o pagamento.';
  ELSE
    SELECT starts_at, service_name_snapshot INTO v_reservation FROM reservations WHERE id = NEW.reservation_id;

    IF v_reservation.starts_at IS NULL THEN
      RETURN NEW;
    END IF;

    v_title := 'Novo pedido de sessão';
    v_body := v_client_name || ' pediu ' || COALESCE(v_reservation.service_name_snapshot, 'uma sessão') || ' para '
      || to_char(v_reservation.starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI') || '. Confirma o pagamento.';
  END IF;

  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT r.user_id, 'admin', v_title, v_body, '/admin/payments'
  FROM user_roles r
  WHERE r.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admin_on_payment_request ON public.payment_requests;
CREATE TRIGGER notify_admin_on_payment_request
  AFTER INSERT ON public.payment_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_admin_on_payment_request();

-- Same as before, without its own notification
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
AS $$
DECLARE
  v_payment_request_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  IF p_plan_type NOT IN ('S', 'X') THEN
    RAISE EXCEPTION 'Plano inválido: %', p_plan_type;
  END IF;

  INSERT INTO public.payment_requests (
    user_id, amount_eur, currency, type, plan_type, friend_code, payment_method, points_used, status
  )
  VALUES (
    p_user_id, p_amount_eur, 'EUR', 'subscription_request', p_plan_type, p_friend_code, p_payment_method, p_points_used, 'pending'
  )
  RETURNING id INTO v_payment_request_id;

  RETURN v_payment_request_id;
END;
$$;

-- =====================================================================
-- 2. A cancelled request may already have been paid for
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

  SELECT full_name INTO v_client_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notifications (user_id, role, title, body, link)
  SELECT r.user_id, 'admin', 'Sessão cancelada',
    COALESCE(v_client_name, 'Um cliente') || ' cancelou a sessão de ' || COALESCE(v_reservation.service_name_snapshot, 'estúdio')
      || COALESCE(' de ' || to_char(v_reservation.starts_at AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI'), '')
      || '. Verifica se o pagamento já tinha sido feito e, se sim, reembolsa o cliente.',
    '/admin/payments'
  FROM user_roles r
  WHERE r.role = 'admin';
END;
$$;

-- =====================================================================
-- 3. New message notifications read like WhatsApp: who it's from, then the
--    message itself. The link is what tells them apart from other notifications.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.message_notification_preview(p_message public.messages)
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_message.attachment_type LIKE 'image/%' THEN '📷 Foto'
    WHEN p_message.attachment_type LIKE 'audio/%' AND p_message.attachment_name LIKE 'voice-%' THEN '🎤 Mensagem de voz'
    WHEN p_message.attachment_type LIKE 'audio/%' THEN '🎵 Áudio'
    ELSE left(COALESCE(NULLIF(trim(p_message.message), ''), 'Nova mensagem'), 180)
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.message_notification_preview(public.messages) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
BEGIN
  IF has_role(NEW.receiver_id, 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, role, title, body, link)
  VALUES (NEW.receiver_id, 'user', COALESCE(v_sender_name, 'Ghost Wayne'), message_notification_preview(NEW), '/messages');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_on_client_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
BEGIN
  IF NOT has_role(NEW.receiver_id, 'admin') OR has_role(NEW.sender_id, 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, role, title, body, link)
  VALUES (
    NEW.receiver_id, 'admin',
    'Mensagem - ' || COALESCE(v_sender_name, 'Cliente'),
    message_notification_preview(NEW),
    '/admin/dashboard?tab=messages&chat=' || NEW.sender_id
  );

  RETURN NEW;
END;
$$;

-- =====================================================================
-- 4. What clients see of the admin. They can't read the admin's profile.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_admin_contact(p_admin_id uuid)
RETURNS TABLE (full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.avatar_url
  FROM profiles p
  WHERE p.id = p_admin_id AND has_role(p.id, 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_contact(uuid) TO authenticated;

-- =====================================================================
-- 5. Names a client has used before, kept for the admin
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profile_name_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_name text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_name_history_user_idx ON public.profile_name_history (user_id, changed_at DESC);

GRANT SELECT ON public.profile_name_history TO authenticated;
GRANT ALL ON public.profile_name_history TO service_role;

ALTER TABLE public.profile_name_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins see previous names" ON public.profile_name_history;
CREATE POLICY "Admins see previous names"
  ON public.profile_name_history FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.record_profile_name_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(trim(OLD.full_name), '') IS NOT NULL THEN
    INSERT INTO profile_name_history (user_id, old_name) VALUES (NEW.id, OLD.full_name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_profile_name_change ON public.profiles;
CREATE TRIGGER record_profile_name_change
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION public.record_profile_name_change();

-- =====================================================================
-- 6. Which clients have booked the most, for the admin's own record.
--    The same rules as the numbers on the admin's profile.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_client_service_ranking(p_kind text)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can see this';
  END IF;

  IF p_kind NOT IN ('sessions', 'mixmaster', 'captacao') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;

  RETURN QUERY
  SELECT b.user_id, p.full_name, p.avatar_url, count(*)
  FROM bookings b
  LEFT JOIN profiles p ON p.id = b.user_id
  WHERE b.hidden_from_admin = false
    AND b.status <> 'cancelled'
    AND CASE p_kind
      WHEN 'sessions' THEN b.starts_at IS NOT NULL
      WHEN 'mixmaster' THEN b.service_name_snapshot ILIKE '%mix%'
      ELSE b.service_name_snapshot ILIKE '%capta%'
    END
  GROUP BY b.user_id, p.full_name, p.avatar_url
  ORDER BY count(*) DESC, p.full_name ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_client_service_ranking(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_client_service_ranking(text) TO authenticated;

-- =====================================================================
-- 7. A picture on a SHOUT
-- =====================================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS image_url text;
