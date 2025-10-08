-- Drop e recriar função para obter data de renovação da subscrição
DROP FUNCTION IF EXISTS public.get_subscription_renewal_date(uuid);

CREATE OR REPLACE FUNCTION public.get_subscription_renewal_date(p_user_id uuid)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT end_date
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY end_date DESC
  LIMIT 1;
$$;