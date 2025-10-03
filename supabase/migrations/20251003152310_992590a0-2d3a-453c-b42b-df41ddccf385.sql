-- 1) Extensões para ranges (anti-overlap)
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- 2) Tabela unavailable_slots (ranges para buffer + reservas confirmadas)
drop table if exists public.unavailable_slots cascade;

create table public.unavailable_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default 'booking_buffer',
  created_at timestamptz not null default now()
);

-- Index para queries rápidas
create index idx_unavailable_starts on public.unavailable_slots(starts_at);
create index idx_unavailable_range on public.unavailable_slots using gist (tstzrange(starts_at, ends_at));

-- Anti-overlap: sintaxe corrigida (WITH && dentro dos parênteses)
alter table public.unavailable_slots 
add constraint unavailable_no_overlap 
exclude using gist (tstzrange(starts_at, ends_at) WITH &&);

-- RLS: todos veem (para calendário); admin pode inserir
alter table public.unavailable_slots enable row level security;

create policy unavailable_select_public on public.unavailable_slots 
for select to anon, authenticated 
using (true);

create policy unavailable_insert_admin on public.unavailable_slots 
for insert to authenticated 
with check (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

-- 3) Função para inserir buffer automático ao aprovar
create or replace function public.insert_booking_buffer(p_starts_at timestamptz, p_ends_at timestamptz)
returns void
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Inserir o slot original (reserva)
  insert into public.unavailable_slots (starts_at, ends_at, reason)
  values (p_starts_at, p_ends_at, 'booking');

  -- Inserir buffer de +1h após o fim
  insert into public.unavailable_slots (starts_at, ends_at, reason)
  values (p_ends_at, p_ends_at + interval '1 hour', 'booking_buffer');
end;
$$;

grant execute on function public.insert_booking_buffer(timestamptz, timestamptz) to authenticated;

-- 4) Atualizar RPC approve para chamar o buffer
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
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') then
    raise exception 'Only admins can approve';
  end if;

  select r.*, pr.amount_eur, pr.currency, pr.user_id
    into v_res
  from public.payment_requests pr
  join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending'
  for update;

  if v_res.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_res.user_id;

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
  update public.payment_requests
     set status = 'approved', decided_by = auth.uid(), decided_at = now()
   where id = p_payment_id;

  -- Criar payments 'paid'
  insert into public.payments (
    payment_request_id, booking_id, user_id, amount_eur, currency, status
  )
  values (
    p_payment_id, v_booking_id, v_res.user_id, v_res.amount_eur, coalesce(v_res.currency,'EUR'), 'paid'
  );

  -- Inserir buffer indisponível (slot +1h)
  perform public.insert_booking_buffer(v_res.starts_at, v_res.ends_at);

  -- Notificação ao cliente
  insert into public.notifications (user_id, role, title, body)
  values (
    v_client_id, 'user',
    'Reserva aprovada!',
    format('A tua sessão de %s está confirmada para %s. Obrigado pelo pagamento!', 
           coalesce(v_res.service_name_snapshot, 'serviço'), 
           to_char(v_res.starts_at, 'DD/MM/YYYY HH24:MI'))
  );

  -- Apagar reservation
  delete from public.reservations where id = v_res.id;

  return v_booking_id;
end;
$$;

grant execute on function public.admin_approve_payment(uuid) to authenticated;

-- 5) Queries para UI: dias indisponíveis e horários
create or replace function public.get_unavailable_days(p_month integer, p_year integer)
returns table (day integer)
security definer
set search_path = public
language sql
stable
as $$
  select extract(day from starts_at)::int as day
  from public.unavailable_slots
  where extract(month from starts_at) = p_month
    and extract(year from starts_at) = p_year
  group by day
  order by day;
$$;

grant execute on function public.get_unavailable_days(integer, integer) to anon, authenticated;

create or replace function public.get_unavailable_times(p_date date)
returns table (starts_at timestamptz, ends_at timestamptz)
security definer
set search_path = public
language sql
stable
as $$
  select starts_at, ends_at
  from public.unavailable_slots
  where date(starts_at) = p_date
  order by starts_at;
$$;

grant execute on function public.get_unavailable_times(date) to anon, authenticated;