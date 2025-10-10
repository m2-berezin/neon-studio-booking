-- Fix delete_mixmaster_project to preserve revenue (payments table)
-- Only delete if payment was not approved yet
CREATE OR REPLACE FUNCTION public.delete_mixmaster_project(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_reservation_id uuid;
  v_status text;
begin
  if not is_admin() then
    raise exception 'Only admins can delete projects';
  end if;

  -- Get reservation_id and status from payment_request
  select reservation_id, status into v_reservation_id, v_status
  from public.payment_requests
  where id = p_payment_id;

  -- If payment was approved, DON'T delete payment_request (preserves revenue in payments table)
  -- Only delete reservation to remove from projects list
  if v_status = 'approved' then
    -- Just delete the reservation, keep payment_request and payments intact for revenue tracking
    if v_reservation_id is not null then
      delete from public.reservations where id = v_reservation_id;
    end if;
  else
    -- If not approved yet, safe to delete both
    delete from public.payment_requests where id = p_payment_id;
    if v_reservation_id is not null then
      delete from public.reservations where id = v_reservation_id;
    end if;
  end if;

  return true;
end;
$function$;