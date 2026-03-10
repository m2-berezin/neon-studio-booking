
-- Reset test data so user can test again
DELETE FROM plan_180day_offers WHERE user_id = '7333c353-07e6-4e46-8061-4fbee49e36da';
DELETE FROM reservations WHERE user_id = '7333c353-07e6-4e46-8061-4fbee49e36da' AND service_name_snapshot ILIKE '%Oferta Plano%180%' AND status = 'pending';
