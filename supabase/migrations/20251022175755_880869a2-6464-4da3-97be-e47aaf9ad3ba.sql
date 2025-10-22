-- Add coins system to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins_balance integer DEFAULT 0;

-- Create coin_transactions table to track all coin movements
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- positive for credits, negative for debits
  transaction_type text NOT NULL, -- 'referral_earned', 'referral_used', 'service_payment', 'expired'
  expires_at timestamp with time zone, -- for referral rewards that expire in 30 days
  is_expired boolean DEFAULT false,
  payment_request_id uuid REFERENCES public.payment_requests(id),
  referral_reward_id uuid REFERENCES public.referral_rewards(id),
  friend_code_use_id uuid REFERENCES public.friend_code_uses(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for coin_transactions
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coin transactions"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all coin transactions"
  ON public.coin_transactions FOR SELECT
  USING (is_admin(auth.uid()));

-- Add coins_amount to referral_rewards (replacing discount_percent logic)
ALTER TABLE public.referral_rewards 
ADD COLUMN IF NOT EXISTS coins_amount integer DEFAULT 2500;

-- Add coins_used to payment_requests
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS coins_used integer DEFAULT 0;

-- Create function to get available (non-expired) coins balance
CREATE OR REPLACE FUNCTION public.get_available_coins(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Sum all non-expired transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.coin_transactions
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_expired = false;
  
  RETURN v_balance;
END;
$$;

-- Create function to use coins (deduct oldest first - FIFO)
CREATE OR REPLACE FUNCTION public.use_coins(p_user_id uuid, p_amount integer, p_payment_request_id uuid)
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
  -- Check available balance
  v_available := public.get_available_coins(p_user_id);
  
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Moedas insuficientes. Disponível: %, Necessário: %', v_available, p_amount;
  END IF;
  
  v_remaining := p_amount;
  
  -- Deduct from oldest credits first (FIFO)
  FOR v_transaction IN
    SELECT id, amount
    FROM public.coin_transactions
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
      -- Mark this credit as fully used
      INSERT INTO public.coin_transactions (user_id, amount, transaction_type, payment_request_id)
      VALUES (p_user_id, -v_transaction.amount, 'service_payment', p_payment_request_id);
      
      v_remaining := v_remaining - v_transaction.amount;
    ELSE
      -- Partially use this credit
      INSERT INTO public.coin_transactions (user_id, amount, transaction_type, payment_request_id)
      VALUES (p_user_id, -v_remaining, 'service_payment', p_payment_request_id);
      
      v_remaining := 0;
    END IF;
  END LOOP;
  
  -- Update profiles coins_balance
  UPDATE public.profiles
  SET coins_balance = public.get_available_coins(p_user_id)
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Create function to award coins (for referrals)
CREATE OR REPLACE FUNCTION public.award_coins(
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
  -- Create coin transaction
  INSERT INTO public.coin_transactions (
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
  
  -- Update profiles coins_balance
  UPDATE public.profiles
  SET coins_balance = public.get_available_coins(p_user_id)
  WHERE id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Enable realtime for coin_transactions
ALTER TABLE public.coin_transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'coin_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;
  END IF;
END $$;