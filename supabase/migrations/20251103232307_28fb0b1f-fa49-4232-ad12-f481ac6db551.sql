-- Drop existing function first
DROP FUNCTION IF EXISTS get_unavailable_times(DATE);

-- Create table for temporary time blocks
CREATE TABLE IF NOT EXISTS public.temporary_time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  blocked_start_time TIME NOT NULL,
  blocked_end_time TIME NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temporary_time_blocks ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage time blocks
CREATE POLICY "Admins can manage temporary time blocks"
ON public.temporary_time_blocks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- RPC function to create temporary time block
CREATE OR REPLACE FUNCTION public.admin_create_time_block(
  p_start_date DATE,
  p_end_date DATE,
  p_blocked_start_time TIME,
  p_blocked_end_time TIME,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_block_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT (role = 'admin') INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can create time blocks';
  END IF;
  
  INSERT INTO temporary_time_blocks (
    start_date,
    end_date,
    blocked_start_time,
    blocked_end_time,
    reason,
    is_active
  ) VALUES (
    p_start_date,
    p_end_date,
    p_blocked_start_time,
    p_blocked_end_time,
    p_reason,
    true
  )
  RETURNING id INTO v_block_id;
  
  RETURN v_block_id;
END;
$$;

-- RPC function to delete temporary time block
CREATE OR REPLACE FUNCTION public.admin_delete_time_block(
  p_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT (role = 'admin') INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can delete time blocks';
  END IF;
  
  UPDATE temporary_time_blocks
  SET is_active = false
  WHERE id = p_id;
END;
$$;

-- Create get_unavailable_times function with temporary time blocks support
CREATE OR REPLACE FUNCTION get_unavailable_times(p_date DATE)
RETURNS TABLE (
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  reason TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Return confirmed bookings
  RETURN QUERY
  SELECT 
    b.starts_at,
    b.ends_at,
    'Reservado'::TEXT as reason
  FROM bookings b
  WHERE DATE(b.starts_at AT TIME ZONE 'Europe/Lisbon') = p_date
    AND b.status = 'confirmed';

  -- Return admin days off (full day blocks)
  RETURN QUERY
  SELECT
    (p_date + d.start_date::TIME) AT TIME ZONE 'Europe/Lisbon' as starts_at,
    (p_date + d.end_date::TIME) AT TIME ZONE 'Europe/Lisbon' as ends_at,
    COALESCE(d.reason, 'Indisponível')::TEXT as reason
  FROM admin_days_off d
  WHERE p_date >= DATE(d.start_date AT TIME ZONE 'Europe/Lisbon')
    AND p_date <= DATE(d.end_date AT TIME ZONE 'Europe/Lisbon')
    AND d.is_active = true;
    
  -- Return temporary time blocks (partial day blocks)
  RETURN QUERY
  SELECT
    (p_date + t.blocked_start_time) AT TIME ZONE 'Europe/Lisbon' as starts_at,
    (p_date + t.blocked_end_time) AT TIME ZONE 'Europe/Lisbon' as ends_at,
    COALESCE(t.reason, 'Horário Indisponível')::TEXT as reason
  FROM temporary_time_blocks t
  WHERE p_date >= t.start_date
    AND p_date <= t.end_date
    AND t.is_active = true;
END;
$$;