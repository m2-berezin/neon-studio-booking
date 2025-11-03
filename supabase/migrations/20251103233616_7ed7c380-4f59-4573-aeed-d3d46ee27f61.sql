-- Fix RLS policies for temporary_time_blocks to allow public read access

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage temporary time blocks" ON public.temporary_time_blocks;

-- Allow everyone to view temporary time blocks
CREATE POLICY "Anyone can view temporary time blocks"
ON public.temporary_time_blocks
FOR SELECT
USING (true);

-- Allow only admins to insert temporary time blocks
CREATE POLICY "Admins can insert temporary time blocks"
ON public.temporary_time_blocks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow only admins to update temporary time blocks
CREATE POLICY "Admins can update temporary time blocks"
ON public.temporary_time_blocks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow only admins to delete temporary time blocks
CREATE POLICY "Admins can delete temporary time blocks"
ON public.temporary_time_blocks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);