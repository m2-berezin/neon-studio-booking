-- Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.check_user_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Add onboarding_completed to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thread_id uuid NOT NULL,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own messages or if they're admin
CREATE POLICY "Users can view their messages or admins can view all"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id 
  OR auth.uid() = receiver_id 
  OR check_user_role(auth.uid(), 'admin')
);

-- RLS Policy: Users can insert messages they send
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  OR check_user_role(auth.uid(), 'admin')
);

-- RLS Policy: Users can update their received messages (mark as read)
CREATE POLICY "Users can update their received messages"
ON public.messages
FOR UPDATE
USING (
  auth.uid() = receiver_id 
  OR check_user_role(auth.uid(), 'admin')
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Function to send welcome messages
CREATE OR REPLACE FUNCTION public.send_welcome_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  new_thread_id uuid := gen_random_uuid();
  profile_exists boolean;
BEGIN
  -- Get Ghost Wayne admin ID
  SELECT user_id INTO admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  AND user_id IN (
    SELECT id FROM auth.users WHERE email = 'ghostwayne777@hotmail.com'
  )
  LIMIT 1;

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;

  -- If no profile yet, wait a moment (trigger runs after profile creation)
  IF NOT profile_exists THEN
    RETURN NEW;
  END IF;

  -- Check if user already received welcome messages
  IF EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.id AND onboarding_completed = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Send first welcome message
  INSERT INTO public.messages (sender_id, receiver_id, thread_id, message, timestamp, is_read)
  VALUES (
    admin_id,
    NEW.id,
    new_thread_id,
    'Bem-vindo à 7T7Studios App, esta é a minha visão para a interação entre a música e a tecnologia. Aqui podes fazer reservas, enviar projetos, comprar beats e ganhar ofertas. 🎁 Qualquer dúvida, manda-me mensagem aqui no chat! 💭',
    NOW(),
    false
  );

  -- Send second welcome message (10 seconds delay)
  INSERT INTO public.messages (sender_id, receiver_id, thread_id, message, timestamp, is_read)
  VALUES (
    admin_id,
    NEW.id,
    new_thread_id,
    'Já agora, pra não dizeres que não ganhas nada com isto... vai à Tab "Recompensas" e vê as ofertas que tens disponíveis. Até já!',
    NOW() + INTERVAL '10 seconds',
    false
  );

  -- Mark onboarding as completed
  UPDATE public.profiles SET onboarding_completed = true WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger for welcome messages (on profile creation, not auth.users)
DROP TRIGGER IF EXISTS trigger_welcome_messages ON public.profiles;
CREATE TRIGGER trigger_welcome_messages
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_messages();

-- Insert admin roles for Ghost Wayne and MAX.I.M
-- Note: This assumes these users already exist in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN ('ghostwayne777@hotmail.com', 'maximberezin.pro@outlook.com')
ON CONFLICT (user_id, role) DO NOTHING;