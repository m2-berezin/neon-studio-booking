-- Corrigir função apply_offer para usar ID correto do serviço
CREATE OR REPLACE FUNCTION public.apply_offer(
  p_user_id uuid,
  p_offer_id uuid,
  p_starts_at timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offer_record RECORD;
  v_usage_count integer;
  v_current_month date;
  v_reservation_id uuid;
  v_service_id uuid;
  v_starts_at timestamp with time zone;
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
  
  -- Usar o ID fixo do serviço Captação 2h (b1041ae7-af06-494e-89e3-a3eafcd1e8e0)
  -- Ou procurar por características (price_eur = 20, duration = 120min, name com 'Captacao' ou '2h')
  SELECT id INTO v_service_id 
  FROM public.services 
  WHERE is_active = true
    AND (
      id = 'b1041ae7-af06-494e-89e3-a3eafcd1e8e0'::uuid
      OR (price_eur = 20 AND duration_minutes = 120)
    )
  LIMIT 1;
  
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado';
  END IF;
  
  -- Usar starts_at fornecido ou NULL (para preencher depois no calendário)
  v_starts_at := p_starts_at;
  
  -- Criar a reserva
  INSERT INTO public.reservations (
    user_id, 
    service_id, 
    offer_id,
    starts_at,
    ends_at,
    duration_minutes_snapshot,
    price_eur_snapshot,
    currency_snapshot,
    service_name_snapshot,
    status
  )
  VALUES (
    p_user_id,
    v_service_id,
    p_offer_id,
    v_starts_at,
    CASE 
      WHEN v_starts_at IS NOT NULL THEN v_starts_at + (v_offer_record.total_duration_min || ' minutes')::INTERVAL
      ELSE NULL
    END,
    v_offer_record.total_duration_min, -- 180 min (3h total)
    v_offer_record.price_eur, -- 20 EUR
    'EUR',
    v_offer_record.name,
    'pending'
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