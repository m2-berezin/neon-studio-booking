-- Deactivate all existing services
UPDATE public.services SET is_active = false;

-- Insert new services
INSERT INTO public.services (name, type, description, base_price, is_active) VALUES
('Captação 3h + Mix&Master', 'recording', 'Sessão de captação de 3 horas com Mix & Master incluído', 70, true),
('Captação 2h', 'recording', 'Sessão de captação de 2 horas', 20, true),
('Captação 3h', 'recording', 'Sessão de captação de 3 horas', 30, true),
('Captação 4h', 'recording', 'Sessão de captação de 4 horas', 40, true),
('Captação 5h', 'recording', 'Sessão de captação de 5 horas', 50, true),
('Mix&Master 1 projeto', 'mixing', 'Mix & Master de 1 projeto', 40, true),
('Mix&Master 2 projetos', 'mixing', 'Mix & Master de 2 projetos', 70, true),
('Beat Exclusivo', 'exclusive_beat', 'Beat exclusivo para uso comercial', 100, true);