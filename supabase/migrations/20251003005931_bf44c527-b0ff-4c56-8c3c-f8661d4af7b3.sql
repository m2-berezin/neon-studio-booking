-- Create unavailable_slots table to track blocked time periods
CREATE TABLE IF NOT EXISTS public.unavailable_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unavailable_slots ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view unavailable slots
CREATE POLICY "Everyone can view unavailable slots"
  ON public.unavailable_slots
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete unavailable slots
CREATE POLICY "Only admins can manage unavailable slots"
  ON public.unavailable_slots
  FOR ALL
  USING (is_admin());

-- Create index for faster queries on date ranges
CREATE INDEX idx_unavailable_slots_time_range ON public.unavailable_slots (start_time, end_time);