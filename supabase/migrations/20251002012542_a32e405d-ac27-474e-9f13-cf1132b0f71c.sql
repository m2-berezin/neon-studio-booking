-- Add receiver_role column to messages table
ALTER TABLE public.messages 
ADD COLUMN receiver_role text;

-- Add index for better performance when filtering by receiver_role
CREATE INDEX idx_messages_receiver_role ON public.messages(receiver_role);

-- Update RLS policies to support shared admin inbox
DROP POLICY IF EXISTS "Users can view messages they sent or received, admins can view " ON public.messages;

CREATE POLICY "Users can view messages they sent or received, admins can view all"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id 
  OR (receiver_role = 'admin' AND is_admin())
  OR (auth.uid() = (SELECT client_id FROM projects WHERE id = messages.project_id))
  OR is_admin()
);

-- Comment explaining the new structure
COMMENT ON COLUMN public.messages.receiver_role IS 'Used for shared inbox - when set to admin, all admins can see the message';
