-- Enable admins to insert point transactions as gifts to users
CREATE POLICY "Admins can insert admin gift point transactions"
ON public.point_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  transaction_type = 'admin_gift' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);