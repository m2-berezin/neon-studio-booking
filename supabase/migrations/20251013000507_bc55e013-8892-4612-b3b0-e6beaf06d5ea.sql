-- Add times_used counter to referral_codes
ALTER TABLE public.referral_codes 
ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0;

-- Create referral_rewards table to track rewards for users who shared codes
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL DEFAULT 25,
  created_from_friend_code_use_id UUID REFERENCES public.friend_code_uses(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_in_payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add referral_reward_id to payment_requests to track which reward was used
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS referral_reward_id UUID REFERENCES public.referral_rewards(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their own rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rewards"
  ON public.referral_rewards FOR SELECT
  USING (is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_expires_at ON public.referral_rewards(expires_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_referral_rewards_updated_at
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update admin_approve_payment function to create referral rewards
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
declare
  v_res record;
  v_booking_id uuid;
  v_client_id uuid;
  v_offer_id uuid;
  v_subscription_id uuid;
  v_plan_type text;
  v_client_name text;
  v_service_name text;
  v_voucher_id uuid;
  v_current_month date;
  v_is_mixmaster boolean;
  v_is_loyalty_offer boolean;
  v_existing_subscription record;
  v_old_subscription_id uuid;
  v_friend_code text;
  v_code_owner_id uuid;
  v_friend_code_use_id uuid;
begin
  if not is_admin() then
    raise exception 'Only admins can approve';
  end if;

  select pr.*, r.offer_id, r.service_name_snapshot, pr.friend_code
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
  v_is_loyalty_offer := (v_res.type = 'loyalty_mixmaster');
  v_friend_code := v_res.friend_code;

  select full_name into v_client_name from public.profiles where id = v_client_id limit 1;

  if v_res.type = 'subscription_request' then
    v_plan_type := v_res.plan_type;
    if v_plan_type is null then
      raise exception 'Plano não encontrado';
    end if;

    select * into v_existing_subscription 
    from public.subscriptions 
    where user_id = v_client_id and is_active = true
    limit 1;

    if v_existing_subscription.id is not null then
      v_old_subscription_id := v_existing_subscription.id;
      delete from public.subscriptions where id = v_old_subscription_id;
    end if;

    insert into public.subscriptions (user_id, plan_type, price_eur, end_date, payment_status, is_active)
    values (v_client_id, v_plan_type, v_res.amount_eur, now() + interval '1 month', 'confirmed', true)
    returning id into v_subscription_id;

    if v_old_subscription_id is not null then
      insert into public.plan_discounts (subscription_id, month_num, discount_pct)
      select v_subscription_id, month_num, discount_pct
      from public.plan_discounts
      where subscription_id = v_old_subscription_id;
      
      delete from public.plan_discounts where subscription_id = v_old_subscription_id;
    else
      insert into public.plan_discounts (subscription_id, month_num, discount_pct)
      values (v_subscription_id, 1, 10.00);
    end if;

    insert into public.notifications (user_id, role, title, body)
    values (v_client_id, 'user', 'Subscrição ativada!', 'A tua subscrição foi ativada por mais um mês!');

    if v_friend_code is not null then
      -- Mark friend code as used
      update public.friend_code_uses
      set used_in_payment = true, payment_request_id = p_payment_id
      where used_by = v_client_id and code = v_friend_code and used_in_payment = false
      returning id into v_friend_code_use_id;
      
      -- Find code owner and increment counter
      select user_id into v_code_owner_id
      from public.referral_codes
      where code = v_friend_code;
      
      if v_code_owner_id is not null then
        -- Increment times_used counter
        update public.referral_codes
        set times_used = times_used + 1
        where code = v_friend_code;
        
        -- Create referral reward for code owner (25% discount valid for 30 days)
        insert into public.referral_rewards (
          user_id, 
          discount_percent, 
          expires_at,
          created_from_friend_code_use_id
        )
        values (
          v_code_owner_id,
          25,
          now() + interval '30 days',
          v_friend_code_use_id
        );
        
        RAISE NOTICE 'Created referral reward for user % (code owner)', v_code_owner_id;
      end if;
    end if;

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

    if v_friend_code is not null then
      -- Mark friend code as used
      update public.friend_code_uses
      set used_in_payment = true, payment_request_id = p_payment_id
      where used_by = v_client_id and code = v_friend_code and used_in_payment = false
      returning id into v_friend_code_use_id;
      
      -- Find code owner and increment counter
      select user_id into v_code_owner_id
      from public.referral_codes
      where code = v_friend_code;
      
      if v_code_owner_id is not null then
        -- Increment times_used counter
        update public.referral_codes
        set times_used = times_used + 1
        where code = v_friend_code;
        
        -- Create referral reward for code owner (25% discount valid for 30 days)
        insert into public.referral_rewards (
          user_id, 
          discount_percent, 
          expires_at,
          created_from_friend_code_use_id
        )
        values (
          v_code_owner_id,
          25,
          now() + interval '30 days',
          v_friend_code_use_id
        );
        
        RAISE NOTICE 'Created referral reward for user % (code owner)', v_code_owner_id;
      end if;
    end if;

    -- Mark referral reward as used if one was applied
    if v_res.referral_reward_id is not null then
      update public.referral_rewards
      set is_used = true, used_in_payment_request_id = p_payment_id
      where id = v_res.referral_reward_id;
    end if;

    if exists (select 1 from public.payment_requests where id = p_payment_id and voucher_id is not null) then
      select voucher_id into v_voucher_id from public.payment_requests where id = p_payment_id;
      update public.vouchers set is_used = true where id = v_voucher_id;
    end if;

    if v_offer_id is not null then
      v_current_month := date_trunc('month', now());
      
      insert into public.user_offers (user_id, offer_id, month_year, used_count)
      values (v_client_id, v_offer_id, v_current_month, 1)
      on conflict (user_id, offer_id, month_year) 
      do update set used_count = user_offers.used_count + 1;
    end if;

    v_is_mixmaster := (v_service_name ILIKE '%mix%master%' OR v_service_name ILIKE '%mix&master%' OR v_service_name ILIKE '%mixmaster%');
    
    if v_is_mixmaster AND NOT v_is_loyalty_offer then
      insert into public.loyalty_points (user_id, booking_id, points_earned)
      values (v_client_id, v_booking_id, 1);
    end if;

    if v_is_loyalty_offer then
      with oldest_points as (
        select id from public.loyalty_points 
        where user_id = v_client_id 
        order by earned_at asc 
        limit 7
      )
      delete from public.loyalty_points where id in (select id from oldest_points);
    end if;

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

    return v_booking_id;
  end if;
end;
$function$;