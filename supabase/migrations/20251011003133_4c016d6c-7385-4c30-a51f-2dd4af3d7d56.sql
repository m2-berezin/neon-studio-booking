-- Function to generate friend codes for all existing users without one
CREATE OR REPLACE FUNCTION public.backfill_referral_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users who don't have a referral code
  FOR user_record IN 
    SELECT p.id, p.full_name
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = p.id
    )
  LOOP
    -- Generate code for this user
    PERFORM public.generate_referral_code(user_record.id);
    
    RAISE NOTICE 'Generated referral code for user %', user_record.id;
  END LOOP;
END;
$function$;

-- Execute the backfill function to create codes for existing users
SELECT public.backfill_referral_codes();

-- Create trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate referral code for new user
  PERFORM public.generate_referral_code(NEW.id);
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code();