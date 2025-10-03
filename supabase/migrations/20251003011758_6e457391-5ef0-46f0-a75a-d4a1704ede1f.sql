-- Fix security warning: Add search_path to function
CREATE OR REPLACE FUNCTION create_unavailable_slot()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    INSERT INTO unavailable_slots (start_time, end_time, reason)
    VALUES (
      NEW.start_time,
      NEW.start_time + (NEW.duration || ' hour')::interval + interval '1 hour',
      'Sessão aprovada + descanso'
    );
  END IF;
  RETURN NEW;
END;
$$;