-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Add attachment columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments they're part of" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;

-- Create RLS policies for message-attachments bucket
CREATE POLICY "Users can upload their own message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view message attachments they're part of"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_admin(auth.uid())
  )
);

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;