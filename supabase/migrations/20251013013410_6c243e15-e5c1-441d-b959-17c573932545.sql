-- Create function to send welcome messages and notification to new users
CREATE OR REPLACE FUNCTION send_welcome_messages()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID := '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';
  thread_id TEXT;
  first_message TEXT := 'Olá! Sou o Ghost Wayne. 🦇
🎧 Bem-vindo à 7T7Studios App, esta é a minha visão para a interação entre a música e a tecnologia.
Aqui podes fazer reservas, enviar projetos, comprar beats e ganhar ofertas.
 Qualquer dúvida manda-me mensagem aqui no chat! 💬';
  second_message TEXT := 'Já agora, pra não dizeres que não ganhas nada com isto...
Vai até à Tab "Recompensas" 🎖️ e vê as ofertas que tens disponíveis. Até já!';
BEGIN
  -- Generate thread_id (sorted user ids)
  IF NEW.id < admin_id THEN
    thread_id := NEW.id::TEXT || '-' || admin_id::TEXT;
  ELSE
    thread_id := admin_id::TEXT || '-' || NEW.id::TEXT;
  END IF;

  -- Insert first welcome message
  INSERT INTO public.messages (
    thread_id,
    sender_id,
    receiver_id,
    message,
    timestamp,
    is_read
  ) VALUES (
    thread_id,
    admin_id,
    NEW.id,
    first_message,
    NOW(),
    false
  );

  -- Insert second welcome message (1 second later)
  INSERT INTO public.messages (
    thread_id,
    sender_id,
    receiver_id,
    message,
    timestamp,
    is_read
  ) VALUES (
    thread_id,
    admin_id,
    NEW.id,
    second_message,
    NOW() + INTERVAL '1 second',
    false
  );

  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    read,
    role,
    created_at
  ) VALUES (
    NEW.id,
    'Nova Mensagem',
    'Yoo, é o Ghost, enviei te uma mensagem!',
    false,
    'user',
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new profile is created
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_messages();