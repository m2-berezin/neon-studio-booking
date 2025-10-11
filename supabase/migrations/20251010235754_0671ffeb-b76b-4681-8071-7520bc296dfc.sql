-- Create function for clients to delete their own bookings/projects
CREATE OR REPLACE FUNCTION public.client_delete_project(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  -- Get booking user_id
  select user_id into v_user_id
  from public.bookings
  where id = p_booking_id;

  -- Check if user owns this booking
  if v_user_id != auth.uid() then
    raise exception 'Não tens permissão para eliminar este projeto';
  end if;

  -- Delete booking (this will not affect payments/revenue)
  delete from public.bookings where id = p_booking_id;

  return true;
end;
$function$;

-- Create function to get client's Mix & Master projects
CREATE OR REPLACE FUNCTION public.get_client_mixmaster_projects(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  service_name text,
  amount_eur numeric,
  status text,
  created_at timestamp with time zone,
  transfer_link text,
  note text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    pr.id,
    COALESCE(r.service_name_snapshot, 'Mix & Master') as service_name,
    pr.amount_eur,
    pr.status,
    pr.created_at,
    pr.transfer_link,
    pr.note
  FROM public.payment_requests pr
  LEFT JOIN public.reservations r ON r.id = pr.reservation_id
  WHERE pr.user_id = p_user_id
    AND pr.type = 'reservation'
    AND (
      r.service_name_snapshot ILIKE '%Mix%Master%' 
      OR r.service_name_snapshot ILIKE '%MixMaster%'
      OR pr.note ILIKE '%Mix%Master%'
    )
  ORDER BY pr.created_at DESC;
$function$;