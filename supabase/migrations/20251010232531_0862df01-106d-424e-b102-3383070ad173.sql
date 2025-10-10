-- Create function to get Mix & Master projects for admin
CREATE OR REPLACE FUNCTION public.get_mixmaster_projects()
RETURNS TABLE (
  id uuid,
  client_id uuid,
  client_name text,
  created_at timestamp with time zone,
  transfer_link text,
  note text,
  service_name text,
  amount_eur numeric,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    pr.id,
    pr.user_id as client_id,
    p.full_name as client_name,
    pr.created_at,
    pr.transfer_link,
    pr.note,
    r.service_name_snapshot as service_name,
    pr.amount_eur,
    pr.status
  FROM public.payment_requests pr
  LEFT JOIN public.profiles p ON p.id = pr.user_id
  LEFT JOIN public.reservations r ON r.id = pr.reservation_id
  WHERE pr.type = 'reservation'
    AND (r.service_name_snapshot ILIKE '%Mix%Master%' OR r.service_name_snapshot ILIKE '%MixMaster%')
  ORDER BY pr.created_at DESC;
$function$;