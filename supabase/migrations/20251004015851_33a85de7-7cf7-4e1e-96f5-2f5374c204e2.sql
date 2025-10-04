-- Função RPC para abandonar oferta após timeout ou rejeição
CREATE OR REPLACE FUNCTION public.abandon_offer(p_reservation_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_res_record RECORD;
  v_current_month date;
BEGIN
  -- Obter a reserva
  SELECT * INTO v_res_record 
  FROM public.reservations 
  WHERE id = p_reservation_id 
  FOR UPDATE;
  
  IF v_res_record.id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;
  
  -- Verificar se tem oferta associada
  IF v_res_record.offer_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não tem oferta associada';
  END IF;
  
  -- Marcar reserva como abandoned
  UPDATE public.reservations
  SET status = 'abandoned'
  WHERE id = p_reservation_id;
  
  -- Decrementar used_count em user_offers
  v_current_month := date_trunc('month', v_res_record.created_at);
  
  UPDATE public.user_offers
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE user_id = v_res_record.user_id 
    AND offer_id = v_res_record.offer_id 
    AND month_year = v_current_month;
  
  -- Se used_count ficou 0, remover o registo
  DELETE FROM public.user_offers
  WHERE user_id = v_res_record.user_id 
    AND offer_id = v_res_record.offer_id 
    AND month_year = v_current_month
    AND used_count = 0;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.abandon_offer(uuid) TO authenticated;

-- Modificar admin_reject_payment para chamar abandon_offer quando rejeitar oferta
CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id uuid, p_reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_res record;
  v_reservation_id uuid;
  v_client_id uuid;
  v_has_offer boolean;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') then
    raise exception 'Only admins can reject';
  end if;

  -- Obter dados da reservation ligada ao pedido pendente
  select r.*, pr.amount_eur, pr.currency, pr.user_id, (r.offer_id IS NOT NULL) as has_offer
    into v_res
  from public.payment_requests pr
  join public.reservations r on r.id = pr.reservation_id
  where pr.id = p_payment_id and pr.status = 'pending'
  for update;

  if v_res.id is null then
    raise exception 'Payment request not found or not pending';
  end if;

  v_client_id := v_res.user_id;
  v_has_offer := v_res.has_offer;

  -- Marcar payment_requests como rejected
  update public.payment_requests
     set status = 'rejected',
         note = coalesce(p_reason, note),
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_payment_id
  returning reservation_id into v_reservation_id;

  -- Criar payments com status 'failed' e booking_id=null
  insert into public.payments (
    payment_request_id, booking_id, user_id, amount_eur, currency, status
  )
  values (
    p_payment_id, null, v_res.user_id, v_res.amount_eur, coalesce(v_res.currency, 'EUR'), 'failed'
  );

  -- Notificação ao cliente: reserva rejeitada
  insert into public.notifications (user_id, role, title, body)
  values (
    v_client_id,
    'user',
    'Reserva rejeitada',
    'Reserva rejeitada, experimenta marcar para outro dia!'
  );

  -- Se tinha oferta, chamar abandon_offer para reset
  IF v_has_offer THEN
    PERFORM public.abandon_offer(v_reservation_id);
  ELSE
    -- Se não tinha oferta, apagar normalmente
    delete from public.reservations where id = v_reservation_id;
  END IF;

  return true;
end;
$$;