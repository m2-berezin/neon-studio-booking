-- Insert sample services
INSERT INTO public.services (name, type, base_price, description, is_active) VALUES
('Professional Recording', 'recording', 150.00, 'High-quality recording session with professional equipment and engineering', true),
('Mixing & Production', 'mixing', 200.00, 'Professional mixing and production services to bring your tracks to life', true),
('Mastering Service', 'mastering', 75.00, 'Final mastering to give your music that polished, professional sound', true);

-- Insert sample availability rules (Monday to Friday, 9 AM to 9 PM)
INSERT INTO public.availability_rules (day_of_week, start_time, end_time, effective_from, is_active) VALUES
(1, '09:00:00', '21:00:00', '2024-01-01', true), -- Monday
(2, '09:00:00', '21:00:00', '2024-01-01', true), -- Tuesday
(3, '09:00:00', '21:00:00', '2024-01-01', true), -- Wednesday
(4, '09:00:00', '21:00:00', '2024-01-01', true), -- Thursday
(5, '09:00:00', '21:00:00', '2024-01-01', true), -- Friday
(6, '10:00:00', '18:00:00', '2024-01-01', true); -- Saturday

-- Insert sample blackout dates (for testing)
INSERT INTO public.blackout_dates (date, reason) VALUES
('2024-12-25', 'Christmas Day - Studio Closed'),
('2024-01-01', 'New Year Day - Studio Closed');