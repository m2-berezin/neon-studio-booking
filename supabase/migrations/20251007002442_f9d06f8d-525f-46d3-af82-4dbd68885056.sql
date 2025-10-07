-- Fix infinite recursion by removing role checks from profiles RLS policies
-- and using the separate user_roles table instead

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "p_profiles_select_admin" ON public.profiles;

-- Recreate admin select policy using user_roles table (no recursion)
CREATE POLICY "p_profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

-- Ensure Ghost Wayne has admin role in user_roles table
INSERT INTO public.user_roles (user_id, role)
VALUES ('6d9d1dc1-e16f-4f3d-a817-1591a1b27477', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure the profile exists with admin role for backward compatibility
UPDATE public.profiles
SET role = 'admin'
WHERE id = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';