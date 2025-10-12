-- Criar oferta PREMIUM+ (Captação 2h grátis para assinantes Plano X)
INSERT INTO public.offers (
  name,
  description,
  price_eur,
  duration_paid_min,
  duration_free_min,
  limit_per_month,
  is_active
)
VALUES (
  'Oferta 2h de Captação por Mês PREMIUM+',
  'Exclusivo para assinantes Plano X - 2h de captação totalmente grátis uma vez por mês',
  0.00,
  0,
  120,
  1,
  true
)
ON CONFLICT DO NOTHING;