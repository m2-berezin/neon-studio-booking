-- Create table to track read messages
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own read status
CREATE POLICY "Users can view their own read status"
ON message_reads
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_message_reads_user_message ON message_reads(user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- Update existing welcome messages to remove "Olá! Sou o Ghost Wayne."
UPDATE messages 
SET body = REPLACE(body, '🦇 Olá! Sou o Ghost Wayne.' || E'\n', '')
WHERE body LIKE '%🦇 Olá! Sou o Ghost Wayne.%';