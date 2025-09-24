-- Insert services with correct types
INSERT INTO public.services (name, type, base_price, description, is_active) VALUES
('Recording Session', 'recording', 20, 'Professional recording session with engineer assistance', true),
('Mixing', 'mixing', 40, 'Professional mixing of your recorded tracks', true),
('Mastering', 'mastering', 40, 'Final mastering to prepare your track for distribution', true),
('Exclusive Beat', 'recording', 150, 'Custom exclusive beat production tailored to your style', true);

-- Insert availability rules for Monday-Friday 10:00-20:00
INSERT INTO public.availability_rules (day_of_week, start_time, end_time, effective_from, effective_to, is_active) VALUES
(1, '10:00:00', '20:00:00', CURRENT_DATE, null, true), -- Monday
(2, '10:00:00', '20:00:00', CURRENT_DATE, null, true), -- Tuesday
(3, '10:00:00', '20:00:00', CURRENT_DATE, null, true), -- Wednesday
(4, '10:00:00', '20:00:00', CURRENT_DATE, null, true), -- Thursday
(5, '10:00:00', '20:00:00', CURRENT_DATE, null, true); -- Friday

-- Insert blackout date (New Year's Day 2025 as example)
INSERT INTO public.blackout_dates (date, reason) VALUES
('2025-01-01', 'New Year''s Day - Studio Closed');

-- Create demo client profile with proper UUID
INSERT INTO public.profiles (id, full_name, phone, role, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Alex Johnson', '+1-555-0123', 'client', NOW(), NOW());

-- Insert sample bookings for the demo client
INSERT INTO public.bookings (
  client_id, 
  service_id, 
  date, 
  start_time, 
  end_time, 
  status, 
  notes,
  created_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM public.services WHERE name = 'Recording Session' LIMIT 1),
  CURRENT_DATE + INTERVAL '3 days',
  '14:00:00',
  '16:00:00',
  'confirmed',
  'First demo session - 2 hour recording block',
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM public.services WHERE name = 'Mixing' LIMIT 1),
  CURRENT_DATE + INTERVAL '7 days',
  '10:00:00',
  '11:00:00',
  'pending',
  'Mixing session for previously recorded tracks',
  NOW()
);