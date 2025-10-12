-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_client_mixmaster_projects(uuid);

-- Create updated function to show both pending payment requests AND confirmed bookings
CREATE OR REPLACE FUNCTION public.get_client_mixmaster_projects(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  service_name text,
  amount_eur numeric,
  status text,
  created_at timestamp with time zone,
  transfer_link text,
  note text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  is_booking boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Get pending payment requests (Mix & Master projects not yet approved)
  SELECT 
    pr.id,
    COALESCE(r.service_name_snapshot, 'Mix&Master') as service_name,
    pr.amount_eur,
    pr.status,
    pr.created_at,
    pr.transfer_link,
    pr.note,
    r.starts_at,
    r.ends_at,
    false as is_booking
  FROM public.payment_requests pr
  LEFT JOIN public.reservations r ON r.id = pr.reservation_id
  WHERE pr.user_id = p_user_id
    AND pr.hidden_from_client = false
    AND pr.status = 'pending'
    AND (
      pr.type = 'mixmaster' 
      OR (r.service_name_snapshot ILIKE '%Mix&Master%' OR r.service_name_snapshot ILIKE '%Mix & Master%' OR r.service_name_snapshot ILIKE '%MixMaster%')
    )
  
  UNION ALL
  
  -- Get confirmed bookings (Mix & Master projects already approved)
  SELECT 
    b.id,
    b.service_name_snapshot as service_name,
    b.price_eur_snapshot as amount_eur,
    b.status,
    b.created_at,
    NULL::text as transfer_link,
    NULL::text as note,
    b.starts_at,
    b.ends_at,
    true as is_booking
  FROM public.bookings b
  WHERE b.user_id = p_user_id
    AND b.hidden_from_client = false
    AND b.status = 'confirmed'
    AND (b.service_name_snapshot ILIKE '%Mix&Master%' OR b.service_name_snapshot ILIKE '%Mix & Master%' OR b.service_name_snapshot ILIKE '%MixMaster%')
  
  ORDER BY created_at DESC;
$function$;