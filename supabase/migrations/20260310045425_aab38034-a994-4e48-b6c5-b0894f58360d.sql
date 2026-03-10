DROP FUNCTION IF EXISTS public.claim_180day_offer(uuid, text);

CREATE FUNCTION public.claim_180day_offer(p_user_id UUID, p_offer_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligibility JSONB;
  v_subscription_id UUID;
  v_offer_record_id UUID;
  v_service_id UUID;
  v_reservation_id UUID;
  v_check_offer_type TEXT;
BEGIN
  -- For mixmaster_with_captacao, check eligibility using base 'mixmaster' type
  IF p_offer_type = 'mixmaster_with_captacao' THEN
    v_check_offer_type := 'mixmaster';
  ELSE
    v_check_offer_type := p_offer_type;
  END IF;

  v_eligibility := public.check_180day_offer_eligibility(p_user_id, v_check_offer_type);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RAISE EXCEPTION 'Not eligible for this offer: %', v_eligibility->>'reason';
  END IF;
  
  v_subscription_id := (v_eligibility->>'subscription_id')::UUID;
  
  IF p_offer_type = 'mixmaster' THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE name ILIKE '%Mix & Master%' AND name NOT ILIKE '%Captação%' AND is_active = true LIMIT 1;
  ELSIF p_offer_type = 'mixmaster_with_captacao' THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE name = 'Captação 3h - 30EUR' AND is_active = true LIMIT 1;
  ELSIF p_offer_type = 'captacao_mixmaster' THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE name ILIKE '%3h + Mix&Master%' AND is_active = true LIMIT 1;
  END IF;
  
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Service not found for offer type: %', p_offer_type;
  END IF;
  
  INSERT INTO public.plan_180day_offers (subscription_id, user_id, plan_type, offer_type, is_claimed, claimed_at)
  SELECT v_subscription_id, p_user_id, s.plan_type, v_check_offer_type, true, NOW()
  FROM public.subscriptions s WHERE s.id = v_subscription_id
  ON CONFLICT (subscription_id, offer_type) 
  DO UPDATE SET is_claimed = true, claimed_at = NOW()
  RETURNING id INTO v_offer_record_id;
  
  INSERT INTO public.reservations (
    user_id, service_id, starts_at, status,
    service_name_snapshot, price_eur_snapshot, duration_minutes_snapshot, currency_snapshot
  ) VALUES (
    p_user_id, v_service_id, NULL, 'pending',
    CASE 
      WHEN p_offer_type = 'mixmaster' THEN 'Mix&Master (Oferta Plano S - 180 dias)'
      WHEN p_offer_type = 'mixmaster_with_captacao' THEN 'Captação 3h + Mix&Master Grátis (Oferta Plano S - 180 dias)'
      ELSE 'Captação 3h + Mix&Master (Oferta Plano X - 180 dias)'
    END,
    CASE WHEN p_offer_type = 'mixmaster_with_captacao' THEN 30.00 ELSE 0.00 END,
    CASE WHEN p_offer_type = 'mixmaster' THEN 0 ELSE 180 END,
    'EUR'
  ) RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;