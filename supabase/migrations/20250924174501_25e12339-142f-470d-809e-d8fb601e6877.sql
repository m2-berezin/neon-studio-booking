-- Enable RLS on all tables (most already enabled, but ensuring completeness)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Users can update their own vouchers" ON public.vouchers;

-- Update subscriptions policies to allow user insert/update
CREATE POLICY "Clients can insert their own subscriptions, admins can insert all" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK ((auth.uid() = client_id) OR is_admin());

CREATE POLICY "Clients can update their own subscriptions, admins can update all" 
ON public.subscriptions 
FOR UPDATE 
USING ((auth.uid() = client_id) OR is_admin());

-- Update vouchers policies to allow user insert/update
CREATE POLICY "Clients can insert their own vouchers, admins can insert all" 
ON public.vouchers 
FOR INSERT 
WITH CHECK ((auth.uid() = client_id) OR is_admin());

CREATE POLICY "Clients can update their own vouchers, admins can update all" 
ON public.vouchers 
FOR UPDATE 
USING ((auth.uid() = client_id) OR is_admin());

-- Ensure notifications has proper INSERT policy for users
DROP POLICY IF EXISTS "Only admins can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications for themselves, admins can create all" 
ON public.notifications 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR is_admin());

-- Update files policies to be more explicit about user permissions
DROP POLICY IF EXISTS "Clients can manage files for their own projects, admins can man" ON public.files;
CREATE POLICY "Clients can insert files for their own projects, admins can insert all" 
ON public.files 
FOR INSERT 
WITH CHECK (((auth.uid() = ( SELECT projects.client_id FROM projects WHERE (projects.id = files.project_id))) OR is_admin()));

CREATE POLICY "Clients can update files for their own projects, admins can update all" 
ON public.files 
FOR UPDATE 
USING (((auth.uid() = ( SELECT projects.client_id FROM projects WHERE (projects.id = files.project_id))) OR is_admin()));

CREATE POLICY "Clients can delete files for their own projects, admins can delete all" 
ON public.files 
FOR DELETE 
USING (((auth.uid() = ( SELECT projects.client_id FROM projects WHERE (projects.id = files.project_id))) OR is_admin()));

-- Add missing DELETE policies where needed
CREATE POLICY "Users can delete their own rewards usage, admins can delete all" 
ON public.rewards_usage 
FOR DELETE 
USING ((auth.uid() = client_id) OR is_admin());

CREATE POLICY "Users can delete their own notifications, admins can delete all" 
ON public.notifications 
FOR DELETE 
USING ((auth.uid() = user_id) OR is_admin());

-- Ensure profiles has DELETE policy
CREATE POLICY "Users can delete their own profile, admins can delete all" 
ON public.profiles 
FOR DELETE 
USING ((auth.uid() = id) OR is_admin());