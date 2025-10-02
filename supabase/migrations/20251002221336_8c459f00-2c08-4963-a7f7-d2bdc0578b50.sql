-- Fix foreign keys in messages table to reference profiles instead of users
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Configure admin users in user_roles
DO $$
DECLARE
  ghost_wayne_id uuid;
  maxim_id uuid;
BEGIN
  -- Get Ghost Wayne's user ID
  SELECT id INTO ghost_wayne_id
  FROM auth.users
  WHERE email = 'ghostwayne777@hotmail.com'
  LIMIT 1;

  -- Get MAX.I.M's user ID
  SELECT id INTO maxim_id
  FROM auth.users
  WHERE email = 'maximberezin.pro@outlook.com'
  LIMIT 1;

  -- Insert admin roles if users exist
  IF ghost_wayne_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (ghost_wayne_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF maxim_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (maxim_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp DESC);

-- Backfill function: send welcome messages to existing users who haven't received them
CREATE OR REPLACE FUNCTION public.backfill_welcome_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  user_record RECORD;
  new_thread_id uuid;
BEGIN
  -- Get Ghost Wayne admin ID
  SELECT user_id INTO admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  AND user_id IN (
    SELECT id FROM auth.users WHERE email = 'ghostwayne777@hotmail.com'
  )
  LIMIT 1;

  -- If no admin found, exit
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Admin Ghost Wayne not found';
    RETURN;
  END IF;

  -- Loop through all profiles that haven't completed onboarding
  FOR user_record IN 
    SELECT id FROM public.profiles 
    WHERE (onboarding_completed = false OR onboarding_completed IS NULL)
    AND id != admin_id
  LOOP
    new_thread_id := gen_random_uuid();

    -- Send first welcome message
    INSERT INTO public.messages (sender_id, receiver_id, thread_id, message, timestamp, is_read)
    VALUES (
      admin_id,
      user_record.id,
      new_thread_id,
      'Bem-vindo à 7T7Studios App, esta é a minha visão para a interação entre a música e a tecnologia. Aqui podes fazer reservas, enviar projetos, comprar beats e ganhar ofertas. 🎁 Qualquer dúvida, manda-me mensagem aqui no chat! 💭',
      NOW(),
      false
    );

    -- Send second welcome message (10 seconds delay)
    INSERT INTO public.messages (sender_id, receiver_id, thread_id, message, timestamp, is_read)
    VALUES (
      admin_id,
      user_record.id,
      new_thread_id,
      'Já agora, pra não dizeres que não ganhas nada com isto... vai à Tab "Recompensas" e vê as ofertas que tens disponíveis. Até já!',
      NOW() + INTERVAL '10 seconds',
      false
    );

    -- Mark onboarding as completed
    UPDATE public.profiles SET onboarding_completed = true WHERE id = user_record.id;

    RAISE NOTICE 'Welcome messages sent to user %', user_record.id;
  END LOOP;
END;
$$;

-- Execute backfill immediately
SELECT public.backfill_welcome_messages();