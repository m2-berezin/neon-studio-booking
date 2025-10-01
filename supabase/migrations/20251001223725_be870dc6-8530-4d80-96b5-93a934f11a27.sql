-- Drop existing foreign key to auth.users
ALTER TABLE public.payment_requests 
DROP CONSTRAINT IF EXISTS payment_requests_user_id_fkey;

-- Add foreign key to profiles table
ALTER TABLE public.payment_requests 
ADD CONSTRAINT payment_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;