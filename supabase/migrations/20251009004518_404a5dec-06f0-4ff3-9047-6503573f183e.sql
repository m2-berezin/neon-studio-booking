-- Drop the bookings_no_overlap constraint for testing/development
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;