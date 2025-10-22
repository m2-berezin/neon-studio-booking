-- Ensure RLS policies allow users to see their own point transactions
-- Drop and recreate policies if needed

DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Admins can view all coin transactions" ON public.point_transactions;

-- Create RLS policy for users to view their own transactions
CREATE POLICY "Users can view own point transactions"
ON public.point_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create RLS policy for admins to view all transactions
CREATE POLICY "Admins can view all point transactions"
ON public.point_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);