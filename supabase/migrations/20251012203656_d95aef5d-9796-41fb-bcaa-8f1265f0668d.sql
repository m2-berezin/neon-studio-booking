-- Fix the apply_offer function to avoid ambiguous column references
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
  v_service_id uuid;
  v_reservation_id uuid;
  v_duration_hours integer;
BEGIN
  -- Get offer details - specify columns to avoid ambiguity
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
  
  -- Calculate total duration in hours
  v_duration_hours := v_offer.total_duration_min / 60;
  
  -- Find the appropriate service based on duration
  -- For PREMIUM+ offer (2h free captação), use 2h captação service
  -- For other offers (3h total = 2h paid + 1h free), use 3h service
  IF v_offer.name ILIKE '%PREMIUM+%' THEN
    -- PREMIUM+ offer: 2h captação service
    SELECT s.id INTO v_service_id 
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE c.slug = 'captacao' 
      AND s.duration_minutes = 120
      AND s.is_active = true
    ORDER BY s.sort_order
    LIMIT 1;
  ELSE
    -- Regular offer: 3h captação service
    SELECT s.id INTO v_service_id 
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE c.slug = 'captacao' 
      AND s.duration_minutes = 180
      AND s.is_active = true
    ORDER BY s.sort_order
    LIMIT 1;
  END IF;
  
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado para esta oferta';
  END IF;
  
  -- Create reservation with offer
  INSERT INTO public.reservations (
    user_id,
    service_id,
    starts_at,
    offer_id,
    status
  )
  VALUES (
    p_user_id,
    v_service_id,
    p_starts_at,
    p_offer_id,
    'pending'
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;