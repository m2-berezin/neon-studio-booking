-- Fix existing referral codes that were generated with fallback USER prefix
-- Regenerate codes based on current full_name in profiles

DO $$
DECLARE
  rec RECORD;
  v_code text;
  v_counter integer;
BEGIN
  -- Loop through all referral codes that need fixing
  FOR rec IN 
    SELECT rc.id, rc.user_id, rc.code, p.full_name
    FROM referral_codes rc
    JOIN profiles p ON p.id = rc.user_id
    WHERE rc.code LIKE 'USER%7T7%' OR p.full_name IS NOT NULL
  LOOP
    -- Skip if full_name is null or empty
    IF rec.full_name IS NULL OR trim(rec.full_name) = '' THEN
      CONTINUE;
    END IF;

    -- Generate new code from full_name
    v_counter := 0;
    LOOP
      v_code := upper(replace(rec.full_name, ' ', '')) || '7T7';
      IF v_counter > 0 THEN
        v_code := v_code || v_counter;
      END IF;
      
      -- Check if this code already exists for a different user
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM referral_codes 
        WHERE code = v_code AND user_id != rec.user_id
      );
      
      v_counter := v_counter + 1;
    END LOOP;

    -- Update the code if it's different from current
    IF v_code != rec.code THEN
      -- Update referral_codes table
      UPDATE referral_codes 
      SET code = v_code 
      WHERE id = rec.id;

      -- Update any friend_code_uses that reference the old code
      UPDATE friend_code_uses 
      SET code = v_code 
      WHERE code = rec.code;

      RAISE NOTICE 'Updated code for user %: % -> %', rec.full_name, rec.code, v_code;
    END IF;
  END LOOP;
END $$;

-- Update the generate_referral_code function to ensure it always uses full_name properly
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
    v_full_name := 'USER' || floor(random() * 10000)::text;
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