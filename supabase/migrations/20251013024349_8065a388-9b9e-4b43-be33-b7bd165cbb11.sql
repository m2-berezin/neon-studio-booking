-- Create table to track plan-specific 180-day offers
CREATE TABLE IF NOT EXISTS public.plan_180day_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('S', 'X')),
  offer_type TEXT NOT NULL CHECK (offer_type IN ('mixmaster', 'captacao_mixmaster')),
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(subscription_id, offer_type)
);

-- Enable RLS
ALTER TABLE public.plan_180day_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own 180day offers"
  ON public.plan_180day_offers
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all 180day offers"
  ON public.plan_180day_offers
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Function to check 180-day offer eligibility
CREATE OR REPLACE FUNCTION public.check_180day_offer_eligibility(
  p_user_id UUID,
  p_offer_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_offer RECORD;
  v_days_since_start INTEGER;
  v_days_remaining INTEGER;
BEGIN
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY start_date DESC
  LIMIT 1;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'no_subscription',
      'days_remaining', null
    );
  END IF;
  
  -- Check if offer type matches plan type
  IF (p_offer_type = 'mixmaster' AND v_subscription.plan_type != 'S') OR
     (p_offer_type = 'captacao_mixmaster' AND v_subscription.plan_type != 'X') THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'wrong_plan',
      'days_remaining', null
    );
  END IF;
  
  -- Calculate days since subscription start
  v_days_since_start := EXTRACT(DAY FROM (NOW() - v_subscription.start_date))::INTEGER;
  v_days_remaining := GREATEST(0, 180 - v_days_since_start);
  
  -- Check if offer already claimed
  SELECT * INTO v_offer
  FROM public.plan_180day_offers
  WHERE subscription_id = v_subscription.id AND offer_type = p_offer_type;
  
  IF v_offer.id IS NOT NULL AND v_offer.is_claimed THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'already_claimed',
      'days_remaining', 0
    );
  END IF;
  
  -- Check if 180 days have passed
  IF v_days_since_start >= 180 THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'subscription_id', v_subscription.id,
      'days_remaining', 0
    );
  ELSE
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'waiting_period',
      'days_remaining', v_days_remaining
    );
  END IF;
END;
$$;

-- Function to claim 180-day offer (Plan S: MixMaster, Plan X: Captação 3h + MixMaster)
CREATE OR REPLACE FUNCTION public.claim_180day_offer(
  p_user_id UUID,
  p_offer_type TEXT
)
RETURNS UUID
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
BEGIN
  -- Check eligibility
  v_eligibility := public.check_180day_offer_eligibility(p_user_id, p_offer_type);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RAISE EXCEPTION 'Not eligible for this offer: %', v_eligibility->>'reason';
  END IF;
  
  v_subscription_id := (v_eligibility->>'subscription_id')::UUID;
  
  -- Get the appropriate service
  IF p_offer_type = 'mixmaster' THEN
    -- Plan S: Mix&Master only
    SELECT id INTO v_service_id
    FROM public.services
    WHERE name ILIKE '%Mix & Master%' 
      AND name NOT ILIKE '%Captação%'
      AND is_active = true
    LIMIT 1;
  ELSIF p_offer_type = 'captacao_mixmaster' THEN
    -- Plan X: Captação 3h + Mix&Master
    SELECT id INTO v_service_id
    FROM public.services
    WHERE name ILIKE '%3h + Mix&Master%'
      AND is_active = true
    LIMIT 1;
  END IF;
  
  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Service not found for offer type: %', p_offer_type;
  END IF;
  
  -- Create or update offer record
  INSERT INTO public.plan_180day_offers (subscription_id, user_id, plan_type, offer_type, is_claimed, claimed_at)
  SELECT 
    v_subscription_id,
    p_user_id,
    s.plan_type,
    p_offer_type,
    true,
    NOW()
  FROM public.subscriptions s
  WHERE s.id = v_subscription_id
  ON CONFLICT (subscription_id, offer_type) 
  DO UPDATE SET is_claimed = true, claimed_at = NOW()
  RETURNING id INTO v_offer_record_id;
  
  -- Create reservation with €0 price
  INSERT INTO public.reservations (
    user_id,
    service_id,
    starts_at,
    status,
    service_name_snapshot,
    price_eur_snapshot,
    duration_minutes_snapshot,
    currency_snapshot
  )
  VALUES (
    p_user_id,
    v_service_id,
    NULL, -- Will be set when user selects date/time
    'pending',
    CASE 
      WHEN p_offer_type = 'mixmaster' THEN 'Mix&Master (Oferta Plano S - 180 dias)'
      ELSE 'Captação 3h + Mix&Master (Oferta Plano X - 180 dias)'
    END,
    0.00, -- Free offer
    CASE 
      WHEN p_offer_type = 'mixmaster' THEN 0
      ELSE 180 -- 3h for captacao_mixmaster
    END,
    'EUR'
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;