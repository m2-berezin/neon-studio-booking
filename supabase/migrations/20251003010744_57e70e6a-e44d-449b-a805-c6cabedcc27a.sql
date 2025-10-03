-- Function to create unavailable slot when reservation is approved
CREATE OR REPLACE FUNCTION public.create_unavailable_slot_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Calculate end time: date + time_slot + duration + 1 hour buffer
    session_end_time := (NEW.date || ' ' || NEW.time_slot)::TIMESTAMP + 
                        (NEW.duration || ' hours')::INTERVAL + 
                        INTERVAL '1 hour';
    
    -- Insert into unavailable_slots
    INSERT INTO public.unavailable_slots (start_time, end_time, reason)
    VALUES (
      (NEW.date || ' ' || NEW.time_slot)::TIMESTAMP,
      session_end_time,
      'Sessão aprovada + descanso'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create unavailable slots on approval
DROP TRIGGER IF EXISTS trigger_create_unavailable_slot ON public.reservations;
CREATE TRIGGER trigger_create_unavailable_slot
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_unavailable_slot_on_approval();

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION public.check_reservation_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_start_time TIMESTAMP WITH TIME ZONE;
  new_end_time TIMESTAMP WITH TIME ZONE;
  conflict_count INTEGER;
BEGIN
  -- Calculate the new reservation time range
  new_start_time := (NEW.date || ' ' || NEW.time_slot)::TIMESTAMP;
  new_end_time := new_start_time + (NEW.duration || ' hours')::INTERVAL;
  
  -- Check for conflicts with unavailable_slots
  SELECT COUNT(*) INTO conflict_count
  FROM public.unavailable_slots
  WHERE new_start_time < end_time 
    AND new_end_time > start_time;
  
  -- If there's a conflict, raise an exception
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Horário indisponível. Este horário já está reservado ou em descanso.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check conflicts before inserting reservations
DROP TRIGGER IF EXISTS trigger_check_conflicts ON public.reservations;
CREATE TRIGGER trigger_check_conflicts
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_reservation_conflicts();