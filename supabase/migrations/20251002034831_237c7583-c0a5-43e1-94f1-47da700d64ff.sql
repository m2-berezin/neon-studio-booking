-- Create availabilities table
CREATE TABLE IF NOT EXISTS public.availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, time_slot)
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  duration INTEGER NOT NULL,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  payment_request_id UUID REFERENCES public.payment_requests(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add duration_prices to services if not exists
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS duration_prices JSONB;

-- Create discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  percentage NUMERIC NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_used BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  service_id UUID REFERENCES public.services(id),
  is_active BOOLEAN DEFAULT true,
  is_used BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availabilities
CREATE POLICY "Authenticated users can view availabilities"
  ON public.availabilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage availabilities"
  ON public.availabilities FOR ALL
  TO authenticated
  USING (is_admin());

-- RLS Policies for reservations
CREATE POLICY "Users can view their own reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create their own reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Only admins can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (is_admin());

-- RLS Policies for discounts
CREATE POLICY "Users can view their own discounts"
  ON public.discounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Only admins can manage discounts"
  ON public.discounts FOR ALL
  TO authenticated
  USING (is_admin());

-- RLS Policies for offers
CREATE POLICY "Users can view active offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Only admins can manage offers"
  ON public.offers FOR ALL
  TO authenticated
  USING (is_admin());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.availabilities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;