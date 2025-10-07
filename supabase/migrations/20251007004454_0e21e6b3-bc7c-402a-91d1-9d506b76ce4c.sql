-- Create trigger function to send notifications when messages are received
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  -- Get sender's name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Create notification for the receiver
  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    NEW.receiver_id,
    'user',
    'Nova mensagem',
    'Recebeste uma nova mensagem de ' || COALESCE(sender_name, 'alguém')
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_message_insert ON public.messages;

-- Create trigger on messages table
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();