-- =====================================================================
-- 1. Notifications can open a specific screen when tapped
-- =====================================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text;

-- =====================================================================
-- 2. Days off used the server's clock, so in summer they were blocked
--    one hour early. Hours are now always read in Lisbon time.
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
    (p_date + (d.start_date AT TIME ZONE 'Europe/Lisbon')::TIME) AT TIME ZONE 'Europe/Lisbon' as starts_at,
    (p_date + (d.end_date AT TIME ZONE 'Europe/Lisbon')::TIME) AT TIME ZONE 'Europe/Lisbon' as ends_at,
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
-- 3. Mix & Master projects
--    A project is a timeline of steps: the client's submission, each
--    mix version, the client's notes and the final master. Every step
--    records when the other person saw it.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.mixmaster_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Mix & Master',
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  payment_request_id uuid UNIQUE REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  hidden_from_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mixmaster_projects_client_idx ON public.mixmaster_projects (client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.mixmaster_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mixmaster_projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('submission', 'mix', 'feedback', 'master')),
  author_id uuid NOT NULL,
  version integer,
  link text,
  file_path text,
  file_name text,
  note text,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mixmaster_steps_project_idx ON public.mixmaster_steps (project_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mixmaster_projects TO authenticated;
GRANT ALL ON public.mixmaster_projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mixmaster_steps TO authenticated;
GRANT ALL ON public.mixmaster_steps TO service_role;

ALTER TABLE public.mixmaster_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mixmaster_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view their projects, admins view all" ON public.mixmaster_projects;
CREATE POLICY "Clients view their projects, admins view all"
  ON public.mixmaster_projects FOR SELECT
  USING (client_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins update projects" ON public.mixmaster_projects;
CREATE POLICY "Admins update projects"
  ON public.mixmaster_projects FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Clients view their project steps, admins view all" ON public.mixmaster_steps;
CREATE POLICY "Clients view their project steps, admins view all"
  ON public.mixmaster_steps FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.mixmaster_projects p
      WHERE p.id = project_id AND p.client_id = auth.uid()
    )
  );

-- Live updates for the "seen" confirmations
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mixmaster_steps;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
  NULL;
END;
$$;

-- Projects that existed before this workflow
INSERT INTO public.mixmaster_projects (client_id, title, payment_request_id, hidden_from_admin, created_at, updated_at)
SELECT pr.user_id, 'Mix & Master', pr.id, COALESCE(pr.hidden_from_admin, false), pr.created_at, pr.created_at
FROM public.payment_requests pr
LEFT JOIN public.reservations r ON r.id = pr.reservation_id
LEFT JOIN public.payments pay ON pay.payment_request_id = pr.id
LEFT JOIN public.bookings b ON b.id = pay.booking_id
WHERE pr.status IN ('pending', 'approved')
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pr.user_id)
  AND (
    pr.type IN ('loyalty_mixmaster', 'plan_180day_mixmaster', 'mixmaster')
    OR (r.id IS NOT NULL AND r.starts_at IS NULL AND r.service_name_snapshot ILIKE '%mix%master%')
    OR (b.id IS NOT NULL AND b.starts_at IS NULL AND b.service_name_snapshot ILIKE '%mix%master%')
  )
ON CONFLICT (payment_request_id) DO NOTHING;

INSERT INTO public.mixmaster_steps (project_id, kind, author_id, link, note, seen_at, created_at)
SELECT p.id, 'submission', p.client_id, pr.transfer_link, pr.note, pr.decided_at, pr.created_at
FROM public.mixmaster_projects p
JOIN public.payment_requests pr ON pr.id = p.payment_request_id
WHERE NOT EXISTS (SELECT 1 FROM public.mixmaster_steps s WHERE s.project_id = p.id);

-- =====================================================================
-- 4. A client's own Mix & Master payment is accepted straight away.
--    Patched in place so the rest of admin_approve_payment (points,
--    vouchers, offers, referrals) stays exactly as deployed. Only
--    submit_mixmaster_project below sets this flag; clients can't.
-- =====================================================================
DO $$
DECLARE
  v_definition text;
  v_old text := $old$if\s+not\s+is_admin\(\)\s+then\s+raise\s+exception\s+'Only admins can approve';$old$;
  v_new text := $new$if not is_admin() and current_setting('app.mixmaster_auto_approve', true) is distinct from p_payment_id::text then
    raise exception 'Only admins can approve';$new$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_approve_payment';

  IF position('app.mixmaster_auto_approve' IN v_definition) > 0 THEN
    RETURN; -- Already applied
  END IF;

  IF v_definition !~ v_old THEN
    RAISE EXCEPTION 'admin_approve_payment: expected admin check not found';
  END IF;

  EXECUTE regexp_replace(v_definition, v_old, v_new);
END;
$$;

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

  PERFORM set_config('app.mixmaster_auto_approve', p_payment_id::text, true);
  PERFORM admin_approve_payment(p_payment_id);
  PERFORM set_config('app.mixmaster_auto_approve', '', true);

  UPDATE payment_requests SET decided_by = NULL WHERE id = p_payment_id;

  -- That text is meant for sessions; the client already sees the project
  DELETE FROM notifications
  WHERE user_id = auth.uid() AND title = 'Reserva confirmada!' AND created_at >= now() - interval '1 second';

  PERFORM award_points(auth.uid(), 1500, 'service_reward');

  INSERT INTO mixmaster_projects (client_id, title, payment_request_id)
  VALUES (auth.uid(), v_title, p_payment_id)
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

-- For sessions that include mixing, or anything else the admin delivers
CREATE OR REPLACE FUNCTION public.admin_create_mixmaster_project(p_client_id uuid, p_title text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create projects';
  END IF;

  INSERT INTO mixmaster_projects (client_id, title)
  VALUES (p_client_id, COALESCE(NULLIF(trim(p_title), ''), 'Mix & Master'))
  RETURNING id INTO v_project_id;

  RETURN v_project_id;
END;
$$;

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
  v_link text := NULLIF(trim(p_link), '');
  v_note text := NULLIF(trim(p_note), '');
  v_client_name text;
BEGIN
  SELECT * INTO v_project FROM mixmaster_projects WHERE id = p_project_id;
  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  SELECT count(*) INTO v_versions FROM mixmaster_steps WHERE project_id = p_project_id AND kind = 'mix';

  IF is_admin() THEN
    IF p_kind NOT IN ('mix', 'master') THEN
      RAISE EXCEPTION 'Tipo de envio inválido';
    END IF;
    IF v_link IS NULL AND p_file_path IS NULL THEN
      RAISE EXCEPTION 'Junta um ficheiro ou um link';
    END IF;
    IF p_kind = 'mix' THEN
      IF v_versions >= 7 THEN
        RAISE EXCEPTION 'As 7 versões incluídas já foram enviadas. Envia o Master.';
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
    IF v_versions >= 7 THEN
      RAISE EXCEPTION 'Já usaste as 7 versões incluídas. Fala com o Ghost no chat.';
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
    SELECT r.user_id, 'admin', 'Notas no Mix & Master',
      COALESCE(v_client_name, 'Um cliente') || ' deixou notas em "' || v_project.title || '".',
      '/admin/projects/' || p_project_id
    FROM user_roles r
    WHERE r.role = 'admin';
  ELSE
    INSERT INTO notifications (user_id, role, title, body, link)
    VALUES (
      v_project.client_id, 'user',
      CASE WHEN p_kind = 'master' THEN 'O teu Master está pronto' ELSE 'Nova versão do teu Mix' END,
      CASE WHEN p_kind = 'master'
        THEN 'O Master de "' || v_project.title || '" já está disponível.'
        ELSE 'A versão ' || v_version || '/7 de "' || v_project.title || '" já está disponível.'
      END,
      '/projects/' || p_project_id
    );
  END IF;

  RETURN v_step_id;
END;
$$;

-- Marks the other person's steps as seen. Without a step this covers everything
-- on screen, except a client's link, which only counts once the admin opens it.
CREATE OR REPLACE FUNCTION public.mixmaster_mark_seen(p_project_id uuid, p_step_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() AND NOT EXISTS (
    SELECT 1 FROM mixmaster_projects WHERE id = p_project_id AND client_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  UPDATE mixmaster_steps
  SET seen_at = now()
  WHERE project_id = p_project_id
    AND seen_at IS NULL
    AND author_id <> auth.uid()
    AND (
      id = p_step_id
      OR (p_step_id IS NULL AND NOT (kind = 'submission' AND link IS NOT NULL))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_mixmaster_project(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_mixmaster_project(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mixmaster_add_step(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mixmaster_mark_seen(uuid, uuid) TO authenticated;

-- Delivered audio: the admin uploads, only that client (and admins) can read it.
-- Files live at {client_id}/{project_id}/{file}.
-- (Bucket 'project-files' created via the storage tool; policies below.)

DROP POLICY IF EXISTS "Admins manage project files" ON storage.objects;
CREATE POLICY "Admins manage project files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'project-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'project-files' AND public.is_admin());

DROP POLICY IF EXISTS "Clients read their project files" ON storage.objects;
CREATE POLICY "Clients read their project files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 5. Private address of the admin's calendar subscription
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.admin_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_calendar_tokens TO authenticated;
GRANT ALL ON public.admin_calendar_tokens TO service_role;

-- No policies on purpose: read through the function below or by the feed itself
ALTER TABLE public.admin_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_admin_calendar_token()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can export bookings';
  END IF;

  INSERT INTO admin_calendar_tokens (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT token INTO v_token FROM admin_calendar_tokens WHERE user_id = auth.uid();
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_calendar_token() TO authenticated;