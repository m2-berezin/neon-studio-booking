-- Rename coins to points throughout the database (fixed version)

-- 1. Rename column in profiles
ALTER TABLE public.profiles 
RENAME COLUMN coins_balance TO points_balance;

-- 2. Rename coin_transactions table to point_transactions
ALTER TABLE public.coin_transactions 
RENAME TO point_transactions;

-- 3. Rename column in referral_rewards
ALTER TABLE public.referral_rewards 
RENAME COLUMN coins_amount TO points_amount;

-- 4. Rename column in payment_requests
ALTER TABLE public.payment_requests 
RENAME COLUMN coins_used TO points_used;

-- 5. Update function: get_available_coins → get_available_points
DROP FUNCTION IF EXISTS public.get_available_coins(uuid);
CREATE OR REPLACE FUNCTION public.get_available_points(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.point_transactions
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_expired = false;
  
  RETURN v_balance;
END;
$$;

-- 6. Update function: use_coins → use_points
DROP FUNCTION IF EXISTS public.use_coins(uuid, integer, uuid);
CREATE OR REPLACE FUNCTION public.use_points(p_user_id uuid, p_amount integer, p_payment_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_available integer;
  v_remaining integer;
  v_transaction record;
BEGIN
  v_available := public.get_available_points(p_user_id);
  
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Pontos insuficientes. Disponível: %, Necessário: %', v_available, p_amount;
  END IF;
  
  v_remaining := p_amount;
  
  FOR v_transaction IN
    SELECT id, amount
    FROM public.point_transactions
    WHERE user_id = p_user_id
      AND amount > 0
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_expired = false
    ORDER BY created_at ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;
    
    IF v_transaction.amount <= v_remaining THEN
      INSERT INTO public.point_transactions (user_id, amount, transaction_type, payment_request_id)
      VALUES (p_user_id, -v_transaction.amount, 'service_payment', p_payment_request_id);
      
      v_remaining := v_remaining - v_transaction.amount;
    ELSE
      INSERT INTO public.point_transactions (user_id, amount, transaction_type, payment_request_id)
      VALUES (p_user_id, -v_remaining, 'service_payment', p_payment_request_id);
      
      v_remaining := 0;
    END IF;
  END LOOP;
  
  UPDATE public.profiles
  SET points_balance = public.get_available_points(p_user_id)
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- 7. Update function: award_coins → award_points
DROP FUNCTION IF EXISTS public.award_coins(uuid, integer, text, timestamp with time zone, uuid, uuid);
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid, 
  p_amount integer, 
  p_transaction_type text,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_friend_code_use_id uuid DEFAULT NULL,
  p_referral_reward_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  INSERT INTO public.point_transactions (
    user_id, 
    amount, 
    transaction_type, 
    expires_at,
    friend_code_use_id,
    referral_reward_id
  )
  VALUES (
    p_user_id, 
    p_amount, 
    p_transaction_type,
    p_expires_at,
    p_friend_code_use_id,
    p_referral_reward_id
  )
  RETURNING id INTO v_transaction_id;
  
  UPDATE public.profiles
  SET points_balance = public.get_available_points(p_user_id)
  WHERE id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$;

-- 8. Update apply_friend_code function
DROP FUNCTION IF EXISTS public.apply_friend_code_with_coins(uuid, text);
CREATE OR REPLACE FUNCTION public.apply_friend_code_with_points(p_user_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code_owner_id uuid;
  v_existing_use record;
  v_friend_code_use_id uuid;
BEGIN
  SELECT user_id INTO v_code_owner_id
  FROM public.referral_codes
  WHERE code = p_code AND is_active = true
  LIMIT 1;

  IF v_code_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou inativo');
  END IF;

  IF v_code_owner_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não podes usar o teu próprio código');
  END IF;

  SELECT * INTO v_existing_use
  FROM public.friend_code_uses
  WHERE used_by = p_user_id
  LIMIT 1;

  IF v_existing_use.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já usaste um código de amigo anteriormente');
  END IF;

  INSERT INTO public.friend_code_uses (code, used_by, used_in_payment)
  VALUES (p_code, p_user_id, false)
  RETURNING id INTO v_friend_code_use_id;

  PERFORM public.award_points(
    p_user_id,
    2500,
    'referral_used',
    now() + interval '30 days',
    v_friend_code_use_id,
    NULL
  );

  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    p_user_id,
    'user',
    'Ganhaste 2500 Pontos!',
    'Código de amigo aplicado! Tens 30 dias para usar os pontos.'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'points_awarded', 2500,
    'expires_in_days', 30
  );
END;
$$;

-- 9. Add renamed table to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'point_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.point_transactions;
  END IF;
END $$;