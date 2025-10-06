-- Criar tabela para códigos de amigos
CREATE TABLE IF NOT EXISTS public.friend_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_percent integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

-- Criar tabela para uso de códigos de amigos
CREATE TABLE IF NOT EXISTS public.friend_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL REFERENCES public.friend_codes(code) ON DELETE CASCADE,
  used_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, used_by)
);

-- Enable RLS
ALTER TABLE public.friend_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_code_uses ENABLE ROW LEVEL SECURITY;

-- Policies para friend_codes
CREATE POLICY "Users can view all friend codes"
  ON public.friend_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own friend codes"
  ON public.friend_codes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policies para friend_code_uses
CREATE POLICY "Users can view their own code uses"
  ON public.friend_code_uses FOR SELECT
  TO authenticated
  USING (used_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.friend_codes fc 
    WHERE fc.code = friend_code_uses.code 
    AND fc.created_by = auth.uid()
  ));

CREATE POLICY "Users can insert their own code uses"
  ON public.friend_code_uses FOR INSERT
  TO authenticated
  WITH CHECK (used_by = auth.uid());

-- Criar índices
CREATE INDEX idx_friend_codes_created_by ON public.friend_codes(created_by);
CREATE INDEX idx_friend_codes_code ON public.friend_codes(code);
CREATE INDEX idx_friend_code_uses_used_by ON public.friend_code_uses(used_by);