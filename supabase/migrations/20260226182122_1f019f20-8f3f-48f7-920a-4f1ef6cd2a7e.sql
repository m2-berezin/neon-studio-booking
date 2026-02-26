
-- Drop existing cron job and recreate with correct anon key
SELECT cron.unschedule(1);

SELECT cron.schedule(
  'send-booking-reminders-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://esuascsrlfdbcpikzvlq.supabase.co/functions/v1/send-booking-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdWFzY3NybGZkYmNwaWt6dmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjczMjEsImV4cCI6MjA3NDMwMzMyMX0.ySDA7sSX9g57F4csJ8ypqFGzdj_aVH9hxuHd0qlQylU"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
