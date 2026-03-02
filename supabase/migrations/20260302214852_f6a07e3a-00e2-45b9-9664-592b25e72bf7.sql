CREATE OR REPLACE FUNCTION public.reservations_fill_from_service()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
declare svc record;
begin
  select name, duration_minutes, price_eur, currency
    into svc
  from public.services
  where id = new.service_id;

  if svc.duration_minutes is null or svc.duration_minutes <= 0 then
    raise exception 'Servico % sem duration_minutes valido', new.service_id;
  end if;

  -- calcular fim
  new.ends_at := new.starts_at + make_interval(mins => svc.duration_minutes);

  -- snapshots: only fill if not already set (offers may pre-set these)
  new.service_name_snapshot     := coalesce(new.service_name_snapshot, svc.name);
  new.duration_minutes_snapshot := coalesce(new.duration_minutes_snapshot, svc.duration_minutes);
  new.price_eur_snapshot        := coalesce(new.price_eur_snapshot, svc.price_eur);
  new.currency_snapshot         := coalesce(new.currency_snapshot, svc.currency, 'EUR');

  return new;
end;
$$;