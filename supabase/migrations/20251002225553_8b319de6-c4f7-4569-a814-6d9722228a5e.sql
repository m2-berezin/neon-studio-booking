-- Ensure Ghost Wayne and MAX.I.M are configured as admins
DO $$
DECLARE
  ghost_wayne_id uuid;
  maxim_id uuid;
BEGIN
  -- Get Ghost Wayne user ID
  SELECT id INTO ghost_wayne_id 
  FROM auth.users 
  WHERE email = 'ghostwayne777@hotmail.com';

  -- Get MAX.I.M user ID
  SELECT id INTO maxim_id 
  FROM auth.users 
  WHERE email = 'maximberezin.pro@outlook.com';

  -- Insert Ghost Wayne as admin if not exists
  IF ghost_wayne_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (ghost_wayne_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update profile if exists
    UPDATE public.profiles 
    SET full_name = 'Ghost Wayne'
    WHERE id = ghost_wayne_id;
  END IF;

  -- Insert MAX.I.M as admin if not exists
  IF maxim_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (maxim_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update profile if exists
    UPDATE public.profiles 
    SET full_name = 'MAX.I.M'
    WHERE id = maxim_id;
  END IF;
END $$;

-- Execute backfill to send welcome messages to all users
SELECT public.backfill_welcome_messages();