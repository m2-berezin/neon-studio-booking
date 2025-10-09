-- Make starts_at and ends_at nullable in bookings (allow pending without time)
ALTER TABLE public.bookings 
ALTER COLUMN starts_at DROP NOT NULL;

ALTER TABLE public.bookings 
ALTER COLUMN ends_at DROP NOT NULL;