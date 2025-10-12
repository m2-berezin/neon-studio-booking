-- Fix admin_reject_payment to handle payment requests without reservations (like subscriptions)
CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id uuid, p_reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_payment_request record;
  v_reservation record;
  v_client_id uuid;
  v_has_offer boolean;
begin
  -- Use is_admin() function instead of checking profiles.role
  if not is_admin() then
    raise exception 'Only admins can reject';
  end if;

  -- Get payment request first
  select pr.* into v_payment_request
  from public.payment_requests pr
  where pr.id = p_payment_id and pr.status = 'pending'
  for update;

  if v_payment_request.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_payment_request.user_id;
  v_has_offer := false;

  -- Get reservation if it exists
  if v_payment_request.reservation_id is not null then
    select r.*, (r.offer_id IS NOT NULL) as has_offer into v_reservation
    from public.reservations r
    where r.id = v_payment_request.reservation_id;
    
    if v_reservation.id is not null then
      v_has_offer := v_reservation.has_offer;
    end if;
  end if;

  -- Update payment request to rejected
  update public.payment_requests
     set status = 'rejected',
         note = coalesce(p_reason, note),
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_payment_id;

  -- Create payment record
  insert into public.payments (
    payment_request_id, booking_id, user_id, amount_eur, currency, status
  )
  values (
    p_payment_id, 
    null, 
    v_payment_request.user_id, 
    v_payment_request.amount_eur, 
    coalesce(v_payment_request.currency, 'EUR'), 
    'failed'
  );

  -- Send notification to client
  insert into public.notifications (user_id, role, title, body)
  values (
    v_client_id,
    'user',
    'Reserva rejeitada',
    'Reserva rejeitada, experimenta marcar para outro dia!'
  );

  -- Handle reservation cleanup if it exists
  if v_payment_request.reservation_id is not null then
    IF v_has_offer THEN
      PERFORM public.abandon_offer(v_payment_request.reservation_id);
    ELSE
      delete from public.reservations where id = v_payment_request.reservation_id;
    END IF;
  end if;

  return true;
end;
$function$;