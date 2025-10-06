-- Recriar RPC admin_approve_payment completa (fix corte no if v_offer_id)
drop function if exists public.admin_approve_payment(uuid);

create or replace function public.admin_approve_payment(p_payment_id uuid)
returns uuid
security definer
set search_path = public
language plpgsql
as $$
declare
  v_res record;
  v_booking_id uuid;
  v_client_id uuid;
  v_offer_id uuid;
  v_month_year date;
  v_used_count integer;
  v_is_first_reservation boolean;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only admins can approve';
  end if;

  select r.*, pr.amount_eur, pr.currency, pr.user_id, r.offer_id
    into v_res
  from public.payment_requests pr
  join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending'
  for update;

  if v_res.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_res.user_id;
  v_offer_id := v_res.offer_id;

  -- Check if first reservation for this user (to unlock referrer if referral)
  select not exists(select 1 from public.bookings where user_id = v_client_id) into v_is_first_reservation;

  -- Criar booking
  insert into public.bookings (
    user_id, service_id, starts_at, ends_at, status,
    service_name_snapshot, duration_minutes_snapshot,
    price_eur_snapshot, currency_snapshot
  )
  values (
    v_res.user_id, v_res.service_id, v_res.starts_at, v_res.ends_at, 'confirmed',
    v_res.service_name_snapshot, v_res.duration_minutes_snapshot,
    v_res.price_eur_snapshot, v_res.currency_snapshot
  )
  returning id into v_booking_id;

  -- Marcar payment_request aprovado
  update public.payment_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = p_payment_id;

  -- Criar payments 'paid'
  insert into public.payments (payment_request_id, booking_id, user_id, amount_eur, currency, status)
  values (p_payment_id, v_booking_id, v_res.user_id, v_res.amount_eur, coalesce(v_res.currency,'EUR'), 'paid');

  -- Inserir buffer
  perform public.insert_booking_buffer(v_res.starts_at, v_res.ends_at);

  -- Increment used_count só se offer_id (após confirmação)
  if v_offer_id is not null then
    v_month_year := date_trunc('month', v_res.starts_at);
    select coalesce(used_count, 0) into v_used_count from public.user_offers 
    where user_id = v_client_id and offer_id = v_offer_id and month_year = v_month_year;
    insert into public.user_offers (user_id, offer_id, month_year, used_count)
    values (v_client_id, v_offer_id, v_month_year, v_used_count + 1)
    on conflict (user_id, offer_id, month_year) do update set used_count = public.user_offers.used_count + 1;
  end if;

  -- Unlock referrer discount se first reservation do amigo
  if v_is_first_reservation then
    perform public.unlock_referrer_discount(v_client_id);
  end if;

  -- Inserir projects
  insert into public.projects (user_id, booking_id, title, description, address, date_day, start_time, end_time)
  values (v_client_id, v_booking_id, v_res.service_name_snapshot, format('Sessão confirmada: %s', v_res.service_name_snapshot), 'Rua do Estúdio 123, Lisboa', date(v_res.starts_at), v_res.starts_at, v_res.ends_at);

  -- Notificação
  insert into public.notifications (user_id, role, title, body)
  values (v_client_id, 'user', 'Reserva aprovada!', format('A tua sessão de %s está confirmada para %s. Obrigado pelo pagamento!', v_res.service_name_snapshot, to_char(v_res.starts_at, 'DD/MM/YYYY HH24:MI')));

  -- Apagar reservation
  delete from public.reservations where id = v_res.id;

  return v_booking_id;
end;
$$;

grant execute on function public.admin_approve_payment(uuid) to authenticated;