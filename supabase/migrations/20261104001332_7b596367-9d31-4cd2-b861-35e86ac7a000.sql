-- =====================================================================
-- A Mix & Master is accepted without the admin deciding anything, so its
-- payment is recorded for them instead: it stays in the admin's Payments,
-- they get a notification, and billing counts what was actually paid.
-- =====================================================================
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
  v_booking_id text;
  v_title text := COALESCE(NULLIF(trim(p_title), ''), 'Mix & Master');
  v_client_name text;
  v_method_label text;
  v_accept_error text;
BEGIN
  SELECT pr.id, pr.user_id, pr.amount_eur, pr.payment_method, r.starts_at, r.service_name_snapshot
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
    v_booking_id := admin_approve_payment(p_payment_id);

    UPDATE payment_requests
    SET decided_by = NULL, hidden_from_admin = false
    WHERE id = p_payment_id;

    -- The booking holds the list price; billing should count what was paid after discounts
    UPDATE bookings SET price_eur_snapshot = v_request.amount_eur WHERE id::text = v_booking_id;

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

  -- If the acceptance failed, the payment is waiting in Pending and nothing has been recorded yet
  IF v_accept_error IS NULL THEN
    v_method_label := CASE v_request.payment_method
      WHEN 'mbway' THEN 'MB Way'
      WHEN 'transferencia' THEN 'Transferência Bancária'
      WHEN 'revolut' THEN 'Revolut'
    END;

    INSERT INTO notifications (user_id, role, title, body, link)
    SELECT r.user_id, 'admin', 'Pagamento de Mix & Master',
      COALESCE(v_client_name, 'Um cliente') || CASE
        WHEN v_request.amount_eur > 0 THEN
          ' pagou ' || regexp_replace(to_char(v_request.amount_eur, 'FM999990.00'), '\.00$', '') || '€'
          || COALESCE(' por ' || v_method_label, '') || ' pelo Mix & Master.'
        ELSE ' usou uma oferta no Mix & Master.'
      END,
      '/admin/payments'
    FROM user_roles r
    WHERE r.role = 'admin';
  END IF;

  RETURN v_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_mixmaster_project(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mixmaster_project(uuid, text, text, text) TO authenticated;

-- Projects already accepted automatically (approved with no admin deciding)
UPDATE public.bookings b
SET price_eur_snapshot = pr.amount_eur
FROM public.payments pay
JOIN public.payment_requests pr ON pr.id = pay.payment_request_id
JOIN public.mixmaster_projects m ON m.payment_request_id = pr.id
WHERE pay.booking_id = b.id
  AND b.starts_at IS NULL
  AND pr.status = 'approved'
  AND pr.reservation_id IS NULL
  AND pr.decided_by IS NULL;

UPDATE public.payment_requests pr
SET hidden_from_admin = false
FROM public.mixmaster_projects m
WHERE m.payment_request_id = pr.id
  AND pr.status = 'approved'
  AND pr.reservation_id IS NULL
  AND pr.decided_by IS NULL;