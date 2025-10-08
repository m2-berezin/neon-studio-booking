-- Update admin_approve_payment to call edge function for mixmaster emails
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') then
    raise exception 'Only admins can approve';
  end if;

  select pr.*, r.offer_id, r.service_name_snapshot, pr.transfer_link
    into v_res
  from public.payment_requests pr
  left join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending'
  for update;

  if v_res.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_res.user_id;
  v_offer_id := v_res.offer_id;
  v_service_name := v_res.service_name_snapshot;
  v_transfer_link := v_res.transfer_link;

  -- Get client name
  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  if v_res.type = 'subscription_request' then
    -- Handle subscription
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

    -- Update payment request status
    update public.payment_requests
      set status = 'approved',
          decided_by = auth.uid(),
          decided_at = now()
    where id = p_payment_id;

    return v_res.id;

  else
    -- Handle reservation/mixmaster payment
    -- Mark payment request as approved
    update public.payment_requests
      set status = 'approved',
          decided_by = auth.uid(),
          decided_at = now()
    where id = p_payment_id;

    -- Create booking from reservation
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

    -- Create payment record
    insert into public.payments (
      payment_request_id, booking_id, user_id, amount_eur, currency, status
    )
    values (
      p_payment_id, v_booking_id, v_res.user_id, v_res.amount_eur, coalesce(v_res.currency, 'EUR'), 'paid'
    );

    -- Send notification to client
    insert into public.notifications (user_id, role, title, body)
    values (
      v_client_id,
      'user',
      'Reserva confirmada!',
      'A tua reserva foi aprovada e confirmada!'
    );

    -- Create unavailable slot (if booking has time)
    if exists (select 1 from public.bookings where id = v_booking_id and starts_at is not null) then
      insert into public.unavailable_slots (starts_at, ends_at, reason)
      select 
        starts_at,
        ends_at + interval '1 hour',
        'Sessão + 1h descanso'
      from public.bookings
      where id = v_booking_id;
    end if;

    -- Delete reservation after booking created
    delete from public.reservations where id = v_res.reservation_id;

    -- Send email for Mix&Master if transfer_link exists
    if v_transfer_link is not null and v_service_name ilike '%Mix%Master%' then
      -- Call edge function to send email
      perform net.http_post(
        url := 'https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-mixmaster-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
        ),
        body := jsonb_build_object(
          'client_name', v_client_name,
          'transfer_link', v_transfer_link,
          'service_name', v_service_name
        )
      );
    end if;

    return v_booking_id;
  end if;
end;
$function$;
