-- Create referral_codes table if not exists
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT referral_codes_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- RLS for referral_codes
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_codes_select_own ON public.referral_codes;
CREATE POLICY referral_codes_select_own ON public.referral_codes 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS referral_codes_select_admin ON public.referral_codes;
CREATE POLICY referral_codes_select_admin ON public.referral_codes 
  FOR SELECT TO authenticated 
  USING (EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS referral_codes_insert_own ON public.referral_codes;
CREATE POLICY referral_codes_insert_own ON public.referral_codes 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Recreate function generate_referral_code
DROP FUNCTION IF EXISTS public.generate_referral_code(uuid);

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name text;
  v_code text;
  v_counter integer := 0;
BEGIN
  -- Get full_name from profiles
  SELECT full_name INTO v_full_name FROM public.profiles WHERE id = p_user_id LIMIT 1;
  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Nome de utilizador não encontrado';
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

  -- Insert if not exists, update if exists (now works with unique constraint)
  INSERT INTO public.referral_codes (user_id, code) 
  VALUES (p_user_id, v_code)
  ON CONFLICT (user_id) DO UPDATE SET code = excluded.code;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;