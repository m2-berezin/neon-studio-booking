-- Fix generate_referral_code to handle null/empty full_name
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
BEGIN
  -- Get full_name from profiles
  SELECT full_name INTO v_full_name FROM public.profiles WHERE id = p_user_id LIMIT 1;
  
  -- Use fallback if full_name is NULL or empty
  IF v_full_name IS NULL OR trim(v_full_name) = '' THEN
    v_full_name := 'USER' || floor(random() * 1000)::text;
  END IF;

  -- Generate code: full_name + '7T7', append number if conflict
  LOOP
    v_code := upper(replace(v_full_name, ' ', '')) || '7T7';
    IF v_counter > 0 THEN
      v_code := v_code || v_counter;
    END IF;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code);
    v_counter := v_counter + 1;
  END LOOP;

  -- Insert if not exists, update if exists
  INSERT INTO public.referral_codes (user_id, code) 
  VALUES (p_user_id, v_code)
  ON CONFLICT (user_id) DO UPDATE SET code = excluded.code;

  RETURN v_code;
END;
$function$;