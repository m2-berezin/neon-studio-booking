-- Allow admins to update bookings status
CREATE POLICY "b_update_admin"
ON public.bookings
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));