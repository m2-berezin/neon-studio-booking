-- Drop and recreate get_monthly_revenue function to correctly sum payments
DROP FUNCTION IF EXISTS public.get_monthly_revenue();

CREATE OR REPLACE FUNCTION public.get_monthly_revenue()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount_eur), 0)
  FROM public.payments
  WHERE status = 'paid'
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
$function$;