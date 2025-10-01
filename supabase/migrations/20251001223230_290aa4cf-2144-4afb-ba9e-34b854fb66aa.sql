-- Create payment_requests table
CREATE TABLE public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own payment requests
CREATE POLICY "Users can insert their own payment requests"
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own payment requests, admins can view all
CREATE POLICY "Users can view their own payment requests, admins can view all"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin());

-- Policy: Only admins can update payment requests
CREATE POLICY "Only admins can update payment requests"
ON public.payment_requests
FOR UPDATE
TO authenticated
USING (is_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;

-- Create trigger for updated_at
CREATE TRIGGER update_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();