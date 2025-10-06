-- Add is_read column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;