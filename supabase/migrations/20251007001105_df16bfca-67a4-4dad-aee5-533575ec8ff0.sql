-- Allow admins to view all profiles
CREATE POLICY "p_profiles_select_admin"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Utilizador'
    ),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(
    EXCLUDED.full_name,
    profiles.full_name,
    'Utilizador'
  );
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Insert missing profile for existing user
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    'Utilizador'
  ) as full_name,
  'user' as role
FROM auth.users
WHERE id = '28259024-fe5b-4140-86c5-36c913c8afc4'
ON CONFLICT (id) DO UPDATE
SET full_name = COALESCE(
  EXCLUDED.full_name,
  profiles.full_name,
  'Utilizador'
);