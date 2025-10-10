-- Create function to get monthly revenue from confirmed payments
CREATE OR REPLACE FUNCTION public.get_monthly_revenue()
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(amount_eur), 0)
  from public.payments
  where status = 'paid'
    and extract(month from created_at) = extract(month from now())
    and extract(year from created_at) = extract(year from now());
$function$;