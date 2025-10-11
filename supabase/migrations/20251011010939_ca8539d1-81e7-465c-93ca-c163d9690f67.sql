-- Update existing subscription payment requests with incorrect service names
UPDATE public.reservations r
SET service_name_snapshot = CASE 
  WHEN s.plan_type = 'S' THEN 'Subscrição Plano S'
  WHEN s.plan_type = 'X' THEN 'Subscrição Plano X'
  ELSE service_name_snapshot
END
FROM public.payment_requests pr
LEFT JOIN public.subscriptions s ON s.id = pr.subscription_id
WHERE r.id = pr.reservation_id
  AND pr.type = 'subscription'
  AND r.service_name_snapshot != 'Subscrição Plano S'
  AND r.service_name_snapshot != 'Subscrição Plano X';