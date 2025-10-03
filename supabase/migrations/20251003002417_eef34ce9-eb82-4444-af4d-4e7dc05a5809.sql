-- Update availability rules to include 19:30 as last slot
UPDATE public.availability_rules
SET end_time = '20:00:00'
WHERE is_active = true;