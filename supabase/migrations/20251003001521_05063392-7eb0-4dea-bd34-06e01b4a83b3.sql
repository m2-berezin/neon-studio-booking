-- Update availability rules to extend end time to 22:00
UPDATE public.availability_rules
SET end_time = '22:00:00'
WHERE end_time < '22:00:00';