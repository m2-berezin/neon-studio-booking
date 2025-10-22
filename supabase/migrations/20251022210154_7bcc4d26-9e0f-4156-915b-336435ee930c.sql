
-- Step 1: Create retroactive payment_request for cliente teste's booking
INSERT INTO public.payment_requests (
  id,
  user_id,
  amount_eur,
  currency,
  status,
  type,
  friend_code,
  payment_method,
  decided_at,
  decided_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '3ddf4157-2952-4b66-b20f-4dcd8c82da6c', -- cliente teste
  20.00,
  'EUR',
  'approved',
  'reservation',
  'MARCOSDEPALMADOMINGOS7T7',
  'transfer',
  '2025-10-22 20:43:32',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  '2025-10-22 20:42:57',
  '2025-10-22 20:43:32'
)
RETURNING id;

-- Step 2: Update friend_code_use to link it to the payment_request
WITH new_payment AS (
  SELECT id FROM payment_requests 
  WHERE user_id = '3ddf4157-2952-4b66-b20f-4dcd8c82da6c' 
    AND friend_code = 'MARCOSDEPALMADOMINGOS7T7'
  LIMIT 1
)
UPDATE public.friend_code_uses
SET 
  payment_request_id = (SELECT id FROM new_payment),
  used_in_payment = true
WHERE id = 'b8a8783b-889f-4b28-8c44-02a505d6fc11';

-- Step 3: Create referral_reward for Marcos linked to the friend_code_use
INSERT INTO public.referral_rewards (
  id,
  user_id,
  points_amount,
  discount_percent,
  is_used,
  expires_at,
  created_from_friend_code_use_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '28259024-fe5b-4140-86c5-36c913c8afc4', -- Marcos de Palma Domingos
  2500,
  25,
  false,
  now() + interval '30 days',
  'b8a8783b-889f-4b28-8c44-02a505d6fc11', -- friend_code_use id
  now(),
  now()
);

-- Step 4: Create a notification for Marcos about the referral reward
INSERT INTO public.notifications (
  user_id,
  title,
  body,
  role,
  read,
  created_at
) VALUES (
  '28259024-fe5b-4140-86c5-36c913c8afc4',
  '🎉 Amigo usou o teu código!',
  'O teu amigo "teste" utilizou o teu código de convite MARCOSDEPALMADOMINGOS7T7 e concluiu uma reserva! Os 2500💎 GW ficarão disponíveis quando ele utilizar os pontos ou após 30 dias.',
  'user',
  false,
  now()
);
