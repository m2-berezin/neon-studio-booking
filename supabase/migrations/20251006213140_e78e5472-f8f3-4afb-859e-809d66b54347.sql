-- Add payment_status column to subscriptions table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'payment_status') then
    alter table public.subscriptions add column payment_status text not null default 'pending';
  end if;
end $$;

-- Add unique constraint to plan_discounts if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'plan_discounts_subscription_id_month_num_key'
  ) then
    alter table public.plan_discounts add constraint plan_discounts_subscription_id_month_num_key unique (subscription_id, month_num);
  end if;
end $$;

-- Function to manage subscription renewals/cancellations by admin
create or replace function public.admin_renew_subscription(p_subscription_id uuid, p_action text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_plan_type text;
  v_month_num integer;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only admins can manage subscriptions';
  end if;

  if p_action not in ('aceitar', 'renovar', 'recusar') then
    raise exception 'Ação inválida';
  end if;

  -- Get subscription
  select user_id, plan_type into v_user_id, v_plan_type from public.subscriptions where id = p_subscription_id limit 1;
  if v_user_id is null then
    raise exception 'Subscrição não encontrada';
  end if;

  if p_action = 'aceitar' then
    -- Aceitar: activate with 10% discount for month 1, start counting
    update public.subscriptions set payment_status = 'confirmed', end_date = now() + interval '1 month', is_active = true, start_date = now() where id = p_subscription_id;
    delete from public.plan_discounts where subscription_id = p_subscription_id;
    insert into public.plan_discounts (subscription_id, month_num, discount_pct) values (p_subscription_id, 1, 10.00);
    
    -- Re-create offers
    delete from public.plan_offers where subscription_id = p_subscription_id;
    insert into public.plan_offers (subscription_id, offer_type) values (p_subscription_id, case v_plan_type when 'S' then 'mix_master' when 'X' then 'captacao_mix_master' end);
    
    -- Send notification
    insert into public.notifications (user_id, role, title, body)
    values (v_user_id, 'user', 'Subscrição aceite', 'A tua subscrição foi aceite e está ativa!');

  elsif p_action = 'renovar' then
    -- Renovar: extend by 1 month, apply 15% discount, continue counting
    update public.subscriptions set end_date = end_date + interval '1 month', payment_status = 'confirmed' where id = p_subscription_id;
    
    -- Calculate current month number
    select extract(month from age(now(), (select start_date from public.subscriptions where id = p_subscription_id))) + 1 into v_month_num;
    
    -- Add 15% discount for next month
    insert into public.plan_discounts (subscription_id, month_num, discount_pct) 
    values (p_subscription_id, v_month_num, 15.00)
    on conflict (subscription_id, month_num) do update set discount_pct = 15.00;
    
    -- Send notification
    insert into public.notifications (user_id, role, title, body)
    values (v_user_id, 'user', 'Subscrição renovada', 'A tua subscrição foi renovada por mais um mês!');

  else  -- 'recusar'
    -- Recusar: cancel subscription, remove benefits
    update public.subscriptions set is_active = false, payment_status = 'cancelled' where id = p_subscription_id;
    delete from public.plan_discounts where subscription_id = p_subscription_id;
    delete from public.plan_offers where subscription_id = p_subscription_id;
    
    -- Send notification
    insert into public.notifications (user_id, role, title, body)
    values (v_user_id, 'user', 'Subscrição recusada', 'A tua subscrição foi recusada.');
  end if;

  return true;
end;
$$;

-- RPC function to get subscriptions with client info for admin
create or replace function public.get_admin_subscriptions()
returns table (
  id uuid,
  client_name text,
  client_email text,
  plan_type text,
  payment_status text,
  end_date timestamp with time zone,
  is_active boolean
)
language sql
security definer
set search_path = public
as $$
  select 
    s.id,
    p.full_name as client_name,
    (select email from auth.users where id = s.user_id) as client_email,
    s.plan_type,
    s.payment_status,
    s.end_date,
    s.is_active
  from subscriptions s
  left join profiles p on p.id = s.user_id
  order by s.end_date desc;
$$;