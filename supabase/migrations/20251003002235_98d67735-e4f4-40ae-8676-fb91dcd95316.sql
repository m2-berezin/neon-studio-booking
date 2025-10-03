-- Update availability rules to show only from 10:00 to 19:00 (last slot at 19:00)
UPDATE public.availability_rules
SET 
  start_time = '10:00:00',
  end_time = '19:30:00'
WHERE is_active = true;