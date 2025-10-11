-- Update get_client_mixmaster_projects to correctly filter Mix & Master projects
CREATE OR REPLACE FUNCTION public.get_client_mixmaster_projects(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  service_name text,
  amount_eur numeric,
  status text,
  created_at timestamp with time zone,
  transfer_link text,
  note text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    pr.id,
    COALESCE(r.service_name_snapshot, 'Mix&Master') as service_name,
    pr.amount_eur,
    pr.status,
    pr.created_at,
    pr.transfer_link,
    pr.note
  FROM public.payment_requests pr
  LEFT JOIN public.reservations r ON r.id = pr.reservation_id
  WHERE pr.user_id = p_user_id
    AND pr.hidden_from_client = false
    AND (
      pr.type = 'mixmaster' 
      OR (r.service_name_snapshot ILIKE '%Mix&Master%' OR r.service_name_snapshot ILIKE '%Mix & Master%' OR r.service_name_snapshot ILIKE '%MixMaster%')
    )
  ORDER BY pr.created_at DESC;
$function$;