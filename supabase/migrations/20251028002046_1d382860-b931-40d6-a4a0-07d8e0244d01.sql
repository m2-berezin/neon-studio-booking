-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the booking reminders function to run every hour
SELECT cron.schedule(
  'send-booking-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-booking-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdWFzY3NybGZkYmNwaWt6dmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5MzI5NzQsImV4cCI6MjA0MzUwODk3NH0.OFsV_l8XXsb-7S6q8cwT5aqm7qdkVgNmTKKFTGBCd60"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'send-booking-reminders-hourly';
