-- Desativar regras antigas (duplicadas) mantendo apenas as mais recentes
UPDATE public.availability_rules
SET is_active = false
WHERE effective_from = '2024-01-01';