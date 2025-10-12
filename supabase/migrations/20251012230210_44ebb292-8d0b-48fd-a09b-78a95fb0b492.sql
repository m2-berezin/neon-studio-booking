-- Fix apply_offer to properly set snapshots for PREMIUM+ offers
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
  v_offer record;
  v_service record;
  v_reservation_id uuid;
  v_service_name_snapshot text;
  v_price_eur_snapshot numeric;
BEGIN
  -- Get offer details
  SELECT 
    o.id,
    o.name,
    o.description,
    o.price_eur,
    o.duration_paid_min,
    o.duration_free_min,
    o.total_duration_min,
    o.limit_per_month,
    o.is_active
  INTO v_offer 
  FROM public.offers o
  WHERE o.id = p_offer_id AND o.is_active = true;
  
  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION 'Oferta não encontrada ou inativa';
  END IF;
  
  -- Find the appropriate service based on offer type
  IF v_offer.name ILIKE '%PREMIUM+%' THEN
    -- PREMIUM+ offer: 2h captação service
    SELECT s.* INTO v_service 
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE c.slug = 'captacao' 
      AND s.duration_minutes = 120
      AND s.is_active = true
    ORDER BY s.sort_order
    LIMIT 1;
    
    -- Set custom snapshot for PREMIUM+ offers
    v_service_name_snapshot := 'Captação 2h PREMIUM+';
    v_price_eur_snapshot := 0;  -- Free offer
  ELSE
    -- Regular offer: 3h captação service
    SELECT s.* INTO v_service 
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE c.slug = 'captacao' 
      AND s.duration_minutes = 180
      AND s.is_active = true
    ORDER BY s.sort_order
    LIMIT 1;
    
    -- Use offer price for regular offers
    v_service_name_snapshot := v_service.name || ' (Oferta)';
    v_price_eur_snapshot := v_offer.price_eur;
  END IF;
  
  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado para esta oferta';
  END IF;
  
  -- Create reservation with snapshots for proper display
  INSERT INTO public.reservations (
    user_id,
    service_id,
    starts_at,
    offer_id,
    status,
    service_name_snapshot,
    price_eur_snapshot,
    duration_minutes_snapshot,
    currency_snapshot
  )
  VALUES (
    p_user_id,
    v_service.id,
    p_starts_at,
    p_offer_id,
    'pending',
    v_service_name_snapshot,
    v_price_eur_snapshot,
    v_service.duration_minutes,
    'EUR'
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;