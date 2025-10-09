-- Update RPC send_transfer_email to call Edge Function for real email
drop function if exists public.send_transfer_email(uuid, text, text);

create or replace function public.send_transfer_email(
  p_payment_id uuid,
  p_transfer_link text,
  p_client_name text
)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
declare
  v_service_name text;
  v_subject text;
begin
  -- Get service name
  select service_name_snapshot into v_service_name from public.reservations r join public.payment_requests pr on pr.reservation_id = r.id where pr.id = p_payment_id limit 1;

  v_subject := v_service_name || ' / ' || p_client_name;

  -- Call Edge Function for real send
  perform http_post('https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-mixmaster-email',
    json_build_object('payment_id', p_payment_id, 'transfer_link', p_transfer_link, 'client_name', p_client_name, 'service_name', v_service_name));

  return true;
end;
$$;

grant execute on function public.send_transfer_email(uuid, text, text) to authenticated;