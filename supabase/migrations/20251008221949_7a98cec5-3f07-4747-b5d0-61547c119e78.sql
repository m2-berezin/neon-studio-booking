-- Create validate_referral_on_signup function
CREATE OR REPLACE FUNCTION public.validate_referral_on_signup(
  p_friend_user_id uuid,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Check if code exists and is active
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = p_code AND is_active = true
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Don't allow using own code
  IF v_referrer_id = p_friend_user_id THEN
    RETURN false;
  END IF;

  -- Check if user already used a code
  IF EXISTS (
    SELECT 1 FROM public.friend_code_uses
    WHERE used_by = p_friend_user_id
  ) THEN
    RETURN false;
  END IF;

  -- Record the usage
  INSERT INTO public.friend_code_uses (code, used_by)
  VALUES (p_code, p_friend_user_id);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_on_signup(uuid, text) TO authenticated;