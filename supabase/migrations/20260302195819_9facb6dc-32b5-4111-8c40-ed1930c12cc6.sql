
-- Update apply_friend_code_with_points to award 5000 instead of 2500
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
    5000,
    'referral_used',
    now() + interval '30 days',
    v_friend_code_use_id,
    NULL
  );

  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    p_user_id,
    'user',
    'Ganhaste 5000 Pontos!',
    'Código de amigo aplicado! Tens 30 dias para usar os pontos.'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'points_awarded', 5000,
    'expires_in_days', 30
  );
END;
$$;
