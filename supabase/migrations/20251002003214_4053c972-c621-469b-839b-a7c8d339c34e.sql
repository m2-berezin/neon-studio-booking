-- Enable realtime for message_reads table
ALTER TABLE message_reads REPLICA IDENTITY FULL;

-- Add message_reads table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;