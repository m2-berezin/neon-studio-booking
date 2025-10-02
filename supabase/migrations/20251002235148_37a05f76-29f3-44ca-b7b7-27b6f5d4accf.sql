-- Add read_at column to messages table
ALTER TABLE public.messages
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX idx_messages_read_at ON public.messages(read_at);