-- Drop the old foreign key constraint that's causing the error
ALTER TABLE public.friend_code_uses 
DROP CONSTRAINT IF EXISTS friend_code_uses_code_fkey;

-- Add a proper foreign key constraint to referral_codes table
ALTER TABLE public.friend_code_uses 
ADD CONSTRAINT friend_code_uses_code_fkey 
FOREIGN KEY (code) REFERENCES public.referral_codes(code) 
ON DELETE CASCADE;