-- Function to notify admin when receiving client message
CREATE OR REPLACE FUNCTION public.notify_admin_on_client_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_receiver_role text;
  v_sender_role text;
BEGIN
  -- Get receiver role
  SELECT role INTO v_receiver_role
  FROM public.profiles
  WHERE id = NEW.receiver_id;
  
  -- Get sender role and name
  SELECT role, full_name INTO v_sender_role, v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Only notify if receiver is admin and sender is not admin
  IF v_receiver_role = 'admin' AND v_sender_role != 'admin' THEN
    INSERT INTO public.notifications (user_id, role, title, body)
    VALUES (
      NEW.receiver_id,
      'admin',
      'Recebeu uma mensagem',
      COALESCE(v_sender_name, 'Cliente')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on messages insert
DROP TRIGGER IF EXISTS on_client_message_to_admin ON public.messages;
CREATE TRIGGER on_client_message_to_admin
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_client_message();