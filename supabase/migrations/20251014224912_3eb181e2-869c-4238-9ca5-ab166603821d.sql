-- Corrigir nomes dos serviços: substituir "Captacao" por "Captação"
-- Apenas atualiza os nomes de display, não afeta IDs, slugs ou relações

UPDATE public.services
SET name = REPLACE(name, 'Captacao', 'Captação')
WHERE name LIKE '%Captacao%';

UPDATE public.services
SET description = REPLACE(description, 'Captacao', 'Captação')
WHERE description LIKE '%Captacao%';

-- Atualizar categoria se necessário
UPDATE public.service_categories
SET name = REPLACE(name, 'Captacao', 'Captação')
WHERE name LIKE '%Captacao%';

UPDATE public.service_categories
SET description = REPLACE(description, 'Captacao', 'Captação')
WHERE description LIKE '%Captacao%';