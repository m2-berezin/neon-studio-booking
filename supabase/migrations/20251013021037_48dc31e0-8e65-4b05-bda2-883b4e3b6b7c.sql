-- Fix RLS policies for plan_discounts table
-- The admin_approve_payment function needs to INSERT and DELETE from this table
-- but the table only has SELECT policies, causing "new row violates row-level security" errors

-- Add INSERT policy for admins (security definer functions run as function owner)
CREATE POLICY "plan_discounts_insert_admin" 
ON public.plan_discounts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Add DELETE policy for admins
CREATE POLICY "plan_discounts_delete_admin"
ON public.plan_discounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Add UPDATE policy for admins (for future use)
CREATE POLICY "plan_discounts_update_admin"
ON public.plan_discounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);