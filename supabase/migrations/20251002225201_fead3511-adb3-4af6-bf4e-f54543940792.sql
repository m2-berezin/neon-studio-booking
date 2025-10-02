-- Fix v_messages view to avoid auth.users permission issues
DROP VIEW IF EXISTS public.v_messages;

CREATE OR REPLACE VIEW public.v_messages AS
SELECT 
  m.id,
  m.sender_id,
  m.receiver_id,
  m.thread_id,
  m.message,
  m.timestamp,
  m.is_read,
  m.service_id,
  m.created_at,
  -- Sender display name: if admin -> "Ghost Wayne", else user's name
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = m.sender_id AND role = 'admin'
    ) THEN 'Ghost Wayne'
    ELSE COALESCE(
      (SELECT full_name FROM public.profiles WHERE id = m.sender_id),
      'Usuário'
    )
  END AS sender_display_name,
  -- Receiver display name: if admin -> "Ghost Wayne", else user's name
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = m.receiver_id AND role = 'admin'
    ) THEN 'Ghost Wayne'
    ELSE COALESCE(
      (SELECT full_name FROM public.profiles WHERE id = m.receiver_id),
      'Usuário'
    )
  END AS receiver_display_name
FROM public.messages m;

-- Grant access to the view
GRANT SELECT ON public.v_messages TO authenticated;
GRANT SELECT ON public.v_messages TO anon;