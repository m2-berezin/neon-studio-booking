-- Allow users to delete their own notifications
CREATE POLICY "n_delete_own"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());