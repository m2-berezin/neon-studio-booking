-- Make service_id nullable in reservations table
ALTER TABLE public.reservations 
ALTER COLUMN service_id DROP NOT NULL;