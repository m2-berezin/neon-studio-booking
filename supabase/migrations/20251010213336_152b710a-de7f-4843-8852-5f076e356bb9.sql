-- Update get_active_reservations to show all upcoming confirmed bookings
CREATE OR REPLACE FUNCTION public.get_active_reservations()
 RETURNS TABLE(booking_id uuid, client_name text, service_name text, start_time timestamp with time zone, end_time timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select 
    b.id as booking_id,
    p.full_name as client_name,
    b.service_name_snapshot as service_name,
    b.starts_at as start_time,
    b.ends_at as end_time
  from public.bookings b
  left join public.profiles p on p.id = b.user_id
  where b.status = 'confirmed' and b.ends_at >= now()
  order by b.starts_at asc;
$function$;

-- Update get_active_bookings_count to count all upcoming confirmed bookings
CREATE OR REPLACE FUNCTION public.get_active_bookings_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::int from public.bookings where status = 'confirmed' and ends_at >= now();
$function$;