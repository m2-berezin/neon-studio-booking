-- Add field to track if welcome messages have been sent
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_messages_sent BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN profiles.welcome_messages_sent IS 'Tracks if the user has received the initial welcome messages from Ghost Wayne';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_messages_sent ON profiles(welcome_messages_sent) WHERE welcome_messages_sent = FALSE;