-- Create security definer functions to avoid RLS recursion

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role::app_role
  );
$$;

-- Function to get user's profile role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- Update profiles policies to use security definer functions
DROP POLICY IF EXISTS "p_profiles_select_admin" ON public.profiles;
CREATE POLICY "p_profiles_select_admin" 
ON public.profiles
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update referral_codes policies
DROP POLICY IF EXISTS "referral_codes_select_admin" ON public.referral_codes;
CREATE POLICY "referral_codes_select_admin"
ON public.referral_codes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow all authenticated users to select any active referral code
DROP POLICY IF EXISTS "referral_codes_select_all" ON public.referral_codes;
CREATE POLICY "referral_codes_select_all"
ON public.referral_codes
FOR SELECT
USING (is_active = true);