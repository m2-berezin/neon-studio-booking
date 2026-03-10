
CREATE OR REPLACE FUNCTION public.get_unavailable_times(p_date date)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, reason text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Return confirmed bookings WITH 1h rest buffer
  RETURN QUERY
  SELECT 
    b.starts_at,
    b.ends_at + interval '1 hour',
    'Reservado'::TEXT as reason
  FROM bookings b
  WHERE DATE(b.starts_at AT TIME ZONE 'Europe/Lisbon') = p_date
    AND b.status = 'confirmed';

  -- Return unavailable_slots (manually inserted by admin or system)
  RETURN QUERY
  SELECT
    u.starts_at,
    u.ends_at,
    u.reason::TEXT
  FROM unavailable_slots u
  WHERE DATE(u.starts_at AT TIME ZONE 'Europe/Lisbon') = p_date;

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
