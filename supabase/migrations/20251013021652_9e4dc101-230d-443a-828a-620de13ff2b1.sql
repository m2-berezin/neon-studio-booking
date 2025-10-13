-- Fix plan_discounts RLS policies - Complete rebuild
-- Drop all existing policies first
DROP POLICY IF EXISTS "plan_discounts_insert_admin" ON public.plan_discounts;
DROP POLICY IF EXISTS "plan_discounts_insert_admin_or_approval" ON public.plan_discounts;
DROP POLICY IF EXISTS "plan_discounts_delete_admin" ON public.plan_discounts;
DROP POLICY IF EXISTS "plan_discounts_delete_admin_or_transfer" ON public.plan_discounts;
DROP POLICY IF EXISTS "plan_discounts_update_admin" ON public.plan_discounts;

-- Create new INSERT policy that allows both admin and subscription operations
CREATE POLICY "plan_discounts_insert_policy"
ON public.plan_discounts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is admin
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Allow if inserting for a valid active subscription
  EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.id = plan_discounts.subscription_id
    AND s.is_active = true
  )
);

-- Create new DELETE policy
CREATE POLICY "plan_discounts_delete_policy"
ON public.plan_discounts
FOR DELETE
TO authenticated
USING (
  -- Allow if user is admin
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Allow if deleting for an existing subscription (during transfer)
  EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.id = plan_discounts.subscription_id
  )
);

-- Create UPDATE policy
CREATE POLICY "plan_discounts_update_policy"
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