-- Update availability rules to start at 10:00 and end at 22:00 (last slot will be 21:30-22:00)
UPDATE public.availability_rules
SET 
  start_time = '10:00:00',
  end_time = '22:00:00'
WHERE is_active = true;