DO $$
DECLARE
  v_definition text;
  v_delete text := 'delete\s+from\s+public\.reservations\s+where\s+id\s*=\s*v_res\.reservation_id\s*;';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_approve_payment';

  IF position('reservation_id = null, hidden_from_admin = true' IN v_definition) > 0 THEN
    RETURN; -- Already applied
  END IF;

  IF v_definition !~ v_delete THEN
    RAISE EXCEPTION 'admin_approve_payment: expected reservation delete not found';
  END IF;

  -- Kept for its amount and method, and left out of the admin's list as before
  EXECUTE regexp_replace(v_definition, v_delete,
    'update public.payment_requests set reservation_id = null, hidden_from_admin = true where id = p_payment_id;
    delete from public.reservations where id = v_res.reservation_id;');
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

  -- Created first, so nothing the acceptance does can leave the project without its payment
  INSERT INTO mixmaster_projects (client_id, title, payment_request_id)
  VALUES (auth.uid(), v_title, p_payment_id)
  RETURNING id INTO v_project_id;

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

  IF v_accept_error IS NOT NULL THEN
    UPDATE mixmaster_projects SET auto_accept_error = v_accept_error WHERE id = v_project_id;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.submit_mixmaster_project(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mixmaster_project(uuid, text, text, text) TO authenticated;