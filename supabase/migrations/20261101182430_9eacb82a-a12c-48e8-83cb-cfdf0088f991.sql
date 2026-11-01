-- =====================================================================
-- 1. Remove the 1h rest block between sessions
--
-- admin_approve_payment keeps writing "Sessão + 1h descanso" rows into
-- unavailable_slots (they still colour occupied days in the calendar).
-- Availability now ignores every system-generated row, because confirmed
-- bookings are already returned below with their real end time.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_unavailable_times(p_date date)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, reason text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return confirmed bookings
  RETURN QUERY
  SELECT
    b.starts_at,
    b.ends_at,
    'Reservado'::TEXT as reason
  FROM bookings b
  WHERE DATE(b.starts_at AT TIME ZONE 'Europe/Lisbon') = p_date
    AND b.status = 'confirmed';

  -- Return unavailable_slots inserted manually (system-generated rows are skipped)
  RETURN QUERY
  SELECT
    u.starts_at,
    u.ends_at,
    u.reason::TEXT
  FROM unavailable_slots u
  WHERE DATE(u.starts_at AT TIME ZONE 'Europe/Lisbon') = p_date
    AND u.reason IS DISTINCT FROM 'Sessão + 1h descanso'
    AND u.reason IS DISTINCT FROM 'Sessão aprovada + descanso'
    AND u.reason IS DISTINCT FROM 'booking'
    AND u.reason IS DISTINCT FROM 'booking_buffer';

  -- Return admin days off (full day blocks)
  RETURN QUERY
  SELECT
    (p_date + d.start_date::TIME) AT TIME ZONE 'Europe/Lisbon' as starts_at,
    (p_date + d.end_date::TIME) AT TIME ZONE 'Europe/Lisbon' as ends_at,
    COALESCE(d.reason, 'Indisponível')::TEXT as reason
  FROM admin_days_off d
  WHERE p_date >= DATE(d.start_date AT TIME ZONE 'Europe/Lisbon')
    AND p_date <= DATE(d.end_date AT TIME ZONE 'Europe/Lisbon')
    AND d.is_active = true;

  -- Return temporary time blocks (partial day blocks)
  RETURN QUERY
  SELECT
    (p_date + t.blocked_start_time) AT TIME ZONE 'Europe/Lisbon' as starts_at,
    (p_date + t.blocked_end_time) AT TIME ZONE 'Europe/Lisbon' as ends_at,
    COALESCE(t.reason, 'Horário Indisponível')::TEXT as reason
  FROM temporary_time_blocks t
  WHERE p_date >= t.start_date
    AND p_date <= t.end_date
    AND t.is_active = true;
END;
$$;

-- =====================================================================
-- 2. Let clients see the studio's photo in the chat
--    (clients can't read the admin's row in profiles)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_admin_avatar(p_admin_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.avatar_url
  FROM profiles p
  JOIN user_roles r ON r.user_id = p.id AND r.role = 'admin'
  WHERE p.id = p_admin_id
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_avatar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_avatar(uuid) TO authenticated;

-- =====================================================================
-- 3. Push notifications
-- =====================================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.device_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.device_tokens TO service_role;
REVOKE ALL ON public.device_tokens FROM anon, authenticated;

-- No policies on purpose: the app only goes through the two functions below
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON public.device_tokens (user_id);

CREATE OR REPLACE FUNCTION public.device_tokens_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS device_tokens_set_updated_at ON public.device_tokens;
CREATE TRIGGER device_tokens_set_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.device_tokens_set_updated_at();

CREATE OR REPLACE FUNCTION public.register_device_token(p_token text, p_platform text DEFAULT 'ios')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- A device that logs into another account moves its token to that account
  INSERT INTO device_tokens (token, user_id, platform, updated_at)
  VALUES (p_token, auth.uid(), p_platform, now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(), platform = EXCLUDED.platform, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_device_token(p_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM device_tokens WHERE token = p_token AND user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.register_device_token(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unregister_device_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_device_token(text) TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A failed push must never stop the notification itself from being created
  RAISE WARNING 'send_push_on_notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS send_push_on_notification ON public.notifications;
CREATE TRIGGER send_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();