-- Add attachments field to messages table
ALTER TABLE messages ADD COLUMN attachments jsonb;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false);

-- Create RLS policies for message attachments bucket
CREATE POLICY "Users can upload their own message attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view attachments in their conversations" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'message-attachments' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM messages 
      WHERE (sender_id = auth.uid() OR recipient_id = auth.uid())
      AND attachments ? (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Users can update their own message attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own message attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage all message attachments" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'message-attachments' AND is_admin());