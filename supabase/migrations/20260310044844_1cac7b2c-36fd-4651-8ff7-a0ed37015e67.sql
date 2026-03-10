-- Simulate 180+ days passed: update start_date to 181 days ago
UPDATE subscriptions 
SET start_date = now() - interval '181 days'
WHERE id = '9991d7b3-60bf-41a1-af84-6cce8d2ae7fa';
