-- Ensure the bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- Drop all existing policies for message-attachments
DROP POLICY IF EXISTS "Users can upload their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments they're part of" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all message attachments" ON storage.objects;

-- Create comprehensive RLS policies
CREATE POLICY "Anyone authenticated can upload message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone authenticated can view message attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_admin(auth.uid())
  )
);