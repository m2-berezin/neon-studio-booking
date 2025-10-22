-- Manually credit 2500 points to Marcos for friend code usage by "teste"
-- This is a one-time manual correction

DO $$
DECLARE
  v_marcos_id uuid := '28259024-fe5b-4140-86c5-36c913c8afc4';
  v_transaction_id uuid;
BEGIN
  -- Award 2500 points to Marcos with 30 day expiration
  INSERT INTO public.point_transactions (
    user_id, 
    amount, 
    transaction_type, 
    expires_at,
    notes
  )
  VALUES (
    v_marcos_id, 
    2500, 
    'referral_earned',
    now() + interval '30 days',
    'Manual credit: Friend code MARCOSDEPALMADOMINGOS7T7 used by teste'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update points balance
  UPDATE public.profiles
  SET points_balance = public.get_available_points(v_marcos_id)
  WHERE id = v_marcos_id;
  
  -- Update times_used for the referral code
  UPDATE public.referral_codes 
  SET times_used = times_used + 1
  WHERE code = 'MARCOSDEPALMADOMINGOS7T7';
  
  -- Create notification for Marcos
  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    v_marcos_id,
    'user',
    'Ganhaste 2500 💎!',
    '1 amigo usou o teu código! Tens 30 dias para usar os pontos.'
  );
  
  RAISE NOTICE 'Successfully credited 2500 points to Marcos de Palma Domingos';
END $$;