-- Create storage bucket for beat references
INSERT INTO storage.buckets (id, name, public) VALUES ('beat-references', 'beat-references', false);

-- Create RLS policies for beat references bucket
CREATE POLICY "Users can upload their own beat references" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'beat-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own beat references" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'beat-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own beat references" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'beat-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own beat references" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'beat-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all beat references" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'beat-references' AND is_admin());