-- Create function to calculate monthly revenue from approved payments
CREATE OR REPLACE FUNCTION public.get_monthly_revenue()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(p.amount_eur), 0)
  FROM public.payments p
  WHERE p.status = 'paid'
    AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', NOW());
$$;

-- Create function to get active bookings count
CREATE OR REPLACE FUNCTION public.get_active_bookings_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.bookings
  WHERE status = 'confirmed'
    AND hidden_from_admin = false;
$$;