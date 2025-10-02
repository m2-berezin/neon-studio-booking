-- Drop the current view
DROP VIEW IF EXISTS v_messages;

-- Create v_messages view WITHOUT exposing auth.users
-- This view only uses profiles table and user_roles table
CREATE VIEW v_messages AS
SELECT 
  m.id,
  m.sender_id,
  m.receiver_id,
  m.thread_id,
  m.message,
  m.timestamp,
  m.created_at,
  m.is_read,
  m.service_id,
  -- For sender display name: if sender is admin, show "Ghost Wayne", else show their full_name
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = m.sender_id AND ur.role = 'admin')
    THEN 'Ghost Wayne'
    ELSE COALESCE(sender_profile.full_name, 'Usuário')
  END as sender_display_name,
  -- For receiver display name: if receiver is admin, show "Ghost Wayne", else show their full_name
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = m.receiver_id AND ur.role = 'admin')
    THEN 'Ghost Wayne'
    ELSE COALESCE(receiver_profile.full_name, 'Usuário')
  END as receiver_display_name
FROM messages m
LEFT JOIN profiles sender_profile ON m.sender_id = sender_profile.id
LEFT JOIN profiles receiver_profile ON m.receiver_id = receiver_profile.id;