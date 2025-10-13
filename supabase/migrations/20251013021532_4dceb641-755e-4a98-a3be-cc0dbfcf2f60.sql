-- The issue is that SECURITY DEFINER functions still use auth.uid() of the calling user
-- We need to allow the admin_approve_payment function to insert into plan_discounts
-- The best approach is to check if a subscription exists for the current operation

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "plan_discounts_insert_admin" ON public.plan_discounts;

-- Create a new INSERT policy that allows:
-- 1. Direct admin inserts (for manual operations)
-- 2. Inserts during subscription approval (when subscription_id exists and is valid)
CREATE POLICY "plan_discounts_insert_admin_or_approval"
ON public.plan_discounts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Either user is admin
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Or we're inserting for a valid subscription (during approval process)
  EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.id = plan_discounts.subscription_id
    AND s.is_active = true
  )
);

-- Similarly update DELETE policy to allow deletion during subscription operations
DROP POLICY IF EXISTS "plan_discounts_delete_admin" ON public.plan_discounts;

CREATE POLICY "plan_discounts_delete_admin_or_transfer"
ON public.plan_discounts
FOR DELETE
TO authenticated
USING (
  -- Either user is admin
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Or we're deleting as part of subscription transfer (old subscription exists)
  EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.id = plan_discounts.subscription_id
  )
);