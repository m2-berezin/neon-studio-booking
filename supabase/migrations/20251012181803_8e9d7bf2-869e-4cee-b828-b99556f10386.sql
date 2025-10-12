-- Enable realtime for user_offers table
ALTER TABLE public.user_offers REPLICA IDENTITY FULL;

-- Add user_offers to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_offers;