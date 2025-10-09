-- Fix admin verification in payment functions to use user_roles table instead of profiles.role

-- Update admin_approve_payment to use is_admin() function
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_res record;
  v_booking_id uuid;
  v_client_id uuid;
  v_offer_id uuid;
  v_month_year date;
  v_used_count integer;
  v_is_first_reservation boolean;
  v_subscription_id uuid;
  v_plan_type text;
  v_client_name text;
  v_service_name text;
  v_transfer_link text;
  v_note text;
  v_body text;
  v_headers jsonb;
begin
  -- Use is_admin() function instead of checking profiles.role
  if not is_admin() then
    raise exception 'Only admins can approve';
  end if;

  select pr.*, r.offer_id, r.service_name_snapshot, pr.transfer_link, pr.note
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
  v_transfer_link := v_res.transfer_link;
  v_note := v_res.note;

  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  if v_res.type = 'subscription_request' then
    v_plan_type := v_res.plan_type;
    if v_plan_type is null then
      raise exception 'Plano não encontrado';
    end if;

    insert into public.subscriptions (user_id, plan_type, price_eur, end_date, payment_status)
    values (v_client_id, v_plan_type, v_res.amount_eur, now() + interval '1 month', 'confirmed')
    on conflict (user_id) do update set plan_type = excluded.plan_type, price_eur = excluded.price_eur, end_date = excluded.end_date, payment_status = 'confirmed', is_active = true
    returning id into v_subscription_id;

    insert into public.plan_discounts (subscription_id, month_num, discount_pct)
    values (v_subscription_id, 1, 10.00)
    on conflict (subscription_id, month_num) do nothing;

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
      v_client_id,
      'user',
      'Reserva confirmada!',
      'A tua reserva foi aprovada e confirmada!'
    );

    if exists (select 1 from public.bookings where id = v_booking_id and starts_at is not null) then
      insert into public.unavailable_slots (starts_at, ends_at, reason)
      select 
        starts_at,
        ends_at + interval '1 hour',
        'Sessão + 1h descanso'
      from public.bookings
      where id = v_booking_id;
    end if;

    delete from public.reservations where id = v_res.reservation_id;

    if v_transfer_link is not null and v_service_name ilike '%Mix%Master%' then
      v_body := json_build_object(
        'payment_id', p_payment_id,
        'transfer_link', v_transfer_link,
        'client_name', v_client_name,
        'service_name', v_service_name,
        'notes', coalesce(v_note, 'Sem notas')
      )::text;

      v_headers := json_build_object(
        'Content-Type', 'application/json'
      );

      perform http_post(
        'https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-mixmaster-email',
        v_body,
        v_headers
      );
    end if;

    return v_booking_id;
  end if;
end;
$function$;

-- Update admin_reject_payment to use is_admin() function
CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id uuid, p_reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_res record;
  v_reservation_id uuid;
  v_client_id uuid;
  v_has_offer boolean;
begin
  -- Use is_admin() function instead of checking profiles.role
  if not is_admin() then
    raise exception 'Only admins can reject';
  end if;

  select r.*, pr.amount_eur, pr.currency, pr.user_id, (r.offer_id IS NOT NULL) as has_offer
    into v_res
  from public.payment_requests pr
  join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending'
  for update;

  if v_res.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_res.user_id;
  v_has_offer := v_res.has_offer;

  update public.payment_requests
     set status = 'rejected',
         note = coalesce(p_reason, note),
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_payment_id
  returning reservation_id into v_reservation_id;

  insert into public.payments (
    payment_request_id, booking_id, user_id, amount_eur, currency, status
  )
  values (
    p_payment_id, null, v_res.user_id, v_res.amount_eur, coalesce(v_res.currency, 'EUR'), 'failed'
  );

  insert into public.notifications (user_id, role, title, body)
  values (
    v_client_id,
    'user',
    'Reserva rejeitada',
    'Reserva rejeitada, experimenta marcar para outro dia!'
  );

  IF v_has_offer THEN
    PERFORM public.abandon_offer(v_reservation_id);
  ELSE
    delete from public.reservations where id = v_reservation_id;
  END IF;

  return true;
end;
$function$;

-- Update admin_receive_payment to use is_admin() function
CREATE OR REPLACE FUNCTION public.admin_receive_payment(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_client_id uuid;
  v_client_name text;
  v_service_name text;
  v_transfer_link text;
  v_note text;
begin
  -- Use is_admin() function instead of checking profiles.role
  if not is_admin() then
    raise exception 'Only admins can receive';
  end if;

  select pr.user_id, p.full_name, r.service_name_snapshot, pr.transfer_link, pr.note
    into v_client_id, v_client_name, v_service_name, v_transfer_link, v_note
  from public.payment_requests pr
  join public.profiles p on p.id = pr.user_id
  left join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending';

  if v_client_id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  insert into public.notifications (user_id, role, title, body)
  values (v_client_id, 'user', 'Pagamento Recebido!', 'O teu pagamento foi recebido e processado. Obrigado!');

  perform public.send_transfer_email(p_payment_id, v_transfer_link, v_client_name);

  return true;
end;
$function$;