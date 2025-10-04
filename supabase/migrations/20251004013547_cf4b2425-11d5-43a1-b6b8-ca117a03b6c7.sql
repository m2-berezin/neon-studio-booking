-- 1) Drop exclusion constraint on reservations (pending don't need overlap check — only confirmed bookings)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap;

-- 2) Add exclusion constraint on bookings (only for confirmed) - drop first if exists
DO $$
BEGIN
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap 
EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&);

-- 3) Update RPC apply_offer (skip ends_at if starts_at NULL, no overlap error)
DROP FUNCTION IF EXISTS public.apply_offer(uuid, uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.apply_offer(
  p_user_id uuid,
  p_offer_id uuid,
  p_starts_at timestamptz DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_offer_record RECORD;
  v_usage_count integer;
  v_current_month date;
  v_reservation_id uuid;
  v_service_id uuid;
  v_starts_at timestamp with time zone;
  v_ends_at timestamp with time zone;
BEGIN
  -- Obter a oferta
  SELECT * INTO v_offer_record 
  FROM public.offers 
  WHERE id = p_offer_id AND is_active = true;
  
  IF v_offer_record.id IS NULL THEN
    RAISE EXCEPTION 'Oferta não encontrada ou inativa';
  END IF;
  
  -- Verificar uso mensal
  v_current_month := date_trunc('month', now());
  
  SELECT COALESCE(used_count, 0) INTO v_usage_count
  FROM public.user_offers
  WHERE user_id = p_user_id 
    AND offer_id = p_offer_id 
    AND month_year = v_current_month;
  
  IF v_usage_count >= v_offer_record.limit_per_month THEN
    RAISE EXCEPTION 'Limite mensal de % usos atingido para esta oferta', v_offer_record.limit_per_month;
  END IF;
  
  -- Determinar o serviço baseado na oferta (Captação 2h)
  SELECT id INTO v_service_id 
  FROM public.services 
  WHERE name ILIKE '%2h%' AND is_active = true
  LIMIT 1;
  
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Serviço de gravação 2h não encontrado';
  END IF;
  
  -- Usar starts_at fornecido ou NULL
  v_starts_at := p_starts_at;
  v_ends_at := CASE WHEN v_starts_at IS NOT NULL THEN v_starts_at + (v_offer_record.total_duration_min || ' minutes')::INTERVAL ELSE NULL END;
  
  -- Criar a reserva (starts_at/ends_at NULL OK, no overlap check)
  INSERT INTO public.reservations (
    user_id, service_id, offer_id, starts_at, ends_at,
    duration_minutes_snapshot, price_eur_snapshot, currency_snapshot,
    service_name_snapshot, status
  )
  VALUES (
    p_user_id, v_service_id, p_offer_id, v_starts_at, v_ends_at,
    v_offer_record.total_duration_min, v_offer_record.price_eur, 'EUR',
    v_offer_record.name, 'pending'
  )
  RETURNING id INTO v_reservation_id;
  
  -- Incrementar ou criar o contador de uso
  INSERT INTO public.user_offers (user_id, offer_id, month_year, used_count)
  VALUES (p_user_id, p_offer_id, v_current_month, 1)
  ON CONFLICT (user_id, offer_id, month_year) 
  DO UPDATE SET used_count = user_offers.used_count + 1;
  
  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_offer(uuid, uuid, timestamptz) TO authenticated;