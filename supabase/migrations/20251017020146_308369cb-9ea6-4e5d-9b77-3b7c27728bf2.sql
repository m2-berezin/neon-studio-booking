-- Enable realtime for friend_code_uses table
-- This ensures the client receives real-time updates when admin marks code as used
ALTER TABLE public.friend_code_uses REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'friend_code_uses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_code_uses;
  END IF;
END $$;