-- Fix referral code generation to avoid unnecessary counter increments
-- The issue was that codes were getting a "1" appended even when there was no conflict

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_code text;
  v_counter integer := 0;
  v_existing_code text;
BEGIN
  -- Get full_name from profiles
  SELECT full_name INTO v_full_name FROM public.profiles WHERE id = p_user_id LIMIT 1;
  
  -- Use fallback if full_name is NULL or empty
  IF v_full_name IS NULL OR trim(v_full_name) = '' THEN
    v_full_name := 'USER' || floor(random() * 10000)::text;
  END IF;

  -- Check if user already has a code
  SELECT code INTO v_existing_code FROM public.referral_codes WHERE user_id = p_user_id LIMIT 1;
  
  -- If user already has a code and it matches the expected format, return it
  IF v_existing_code IS NOT NULL AND v_existing_code = upper(replace(v_full_name, ' ', '')) || '7T7' THEN
    RETURN v_existing_code;
  END IF;

  -- Generate new code: full_name + '7T7', append number only if there's an actual conflict
  LOOP
    v_code := upper(replace(v_full_name, ' ', '')) || '7T7';
    IF v_counter > 0 THEN
      v_code := v_code || v_counter;
    END IF;
    
    -- Check if code exists for a DIFFERENT user (not current user)
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.referral_codes 
      WHERE code = v_code AND user_id != p_user_id
    );
    
    v_counter := v_counter + 1;
  END LOOP;

  -- Insert if not exists, update if exists
  INSERT INTO public.referral_codes (user_id, code) 
  VALUES (p_user_id, v_code)
  ON CONFLICT (user_id) DO UPDATE SET code = excluded.code;

  RETURN v_code;
END;
$function$;