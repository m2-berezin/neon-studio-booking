CREATE OR REPLACE FUNCTION create_unavailable_slot()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_unavailable_slot ON reservations;

CREATE TRIGGER trigger_create_unavailable_slot
AFTER UPDATE ON reservations
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_unavailable_slot();