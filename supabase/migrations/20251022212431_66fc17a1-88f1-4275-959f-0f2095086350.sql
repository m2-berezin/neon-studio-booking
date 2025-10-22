
-- Manual retroactive fix for teste2/Marcos referral reward
DO $$
DECLARE
  v_referee_code_use_id uuid := 'f5207f20-b2d3-4cdf-ae51-1d191a5971cc';
  v_referrer_user_id uuid := '28259024-fe5b-4140-86c5-36c913c8afc4'; -- Marcos
  v_referee_user_id uuid := '31b6935c-38d3-4db1-be7e-b9d05a9d1c0c'; -- teste2
  v_referee_name text := 'teste2';
BEGIN
  -- Check if already rewarded for this specific code use
  IF NOT EXISTS(
    SELECT 1 FROM public.referral_rewards 
    WHERE created_from_friend_code_use_id = v_referee_code_use_id
  ) THEN
    -- Give 2500 GW to Marcos
    INSERT INTO public.point_transactions (
      user_id,
      amount,
      transaction_type,
      notes,
      friend_code_use_id
    ) VALUES (
      v_referrer_user_id,
      2500,
      'referral_earned',
      'Recompensa por convite - teste2 utilizou GW (correção retroativa)',
      v_referee_code_use_id
    );

    -- Update Marcos's balance
    UPDATE public.profiles 
    SET points_balance = points_balance + 2500 
    WHERE id = v_referrer_user_id;

    -- Mark the code use as rewarded
    UPDATE public.friend_code_uses
    SET used_in_payment = true
    WHERE id = v_referee_code_use_id;

    -- Create referral_reward record
    INSERT INTO public.referral_rewards (
      user_id,
      points_amount,
      discount_percent,
      expires_at,
      is_used,
      created_from_friend_code_use_id
    ) VALUES (
      v_referrer_user_id,
      2500,
      25,
      now() + interval '30 days',
      false,
      v_referee_code_use_id
    );

    -- Notify Marcos
    INSERT INTO public.notifications (
      user_id,
      role,
      title,
      body
    ) VALUES (
      v_referrer_user_id,
      'user',
      '💎 Recebeste 2500 GW!',
      'O teu amigo teste2 utilizou GW numa reserva! Recebeste 2500💎 GW como recompensa.'
    );
    
    RAISE NOTICE 'Recompensa de 2500 GW dada ao Marcos com sucesso!';
  ELSE
    RAISE NOTICE 'Recompensa já foi dada anteriormente para este código.';
  END IF;
END $$;
