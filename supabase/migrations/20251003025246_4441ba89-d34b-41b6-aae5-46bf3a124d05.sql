-- Allow admins to create bookings for any user
CREATE POLICY "Admins can create bookings for any user"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);