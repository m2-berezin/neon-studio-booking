-- Enable RLS DELETE policy for admins on profiles table
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create function to safely delete a test user
CREATE OR REPLACE FUNCTION public.admin_delete_test_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Delete related records in order (respecting foreign keys)
  
  -- Delete friend code uses
  DELETE FROM public.friend_code_uses WHERE used_by = p_user_id;
  
  -- Delete friend codes
  DELETE FROM public.referral_codes WHERE user_id = p_user_id;
  
  -- Delete point transactions
  DELETE FROM public.point_transactions WHERE user_id = p_user_id;
  
  -- Delete referral rewards
  DELETE FROM public.referral_rewards WHERE user_id = p_user_id;
  
  -- Delete user offers
  DELETE FROM public.user_offers WHERE user_id = p_user_id;
  
  -- Delete loyalty points
  DELETE FROM public.loyalty_points WHERE user_id = p_user_id;
  
  -- Delete plan discounts (via subscriptions)
  DELETE FROM public.plan_discounts 
  WHERE subscription_id IN (SELECT id FROM public.subscriptions WHERE user_id = p_user_id);
  
  -- Delete plan offers
  DELETE FROM public.plan_offers 
  WHERE subscription_id IN (SELECT id FROM public.subscriptions WHERE user_id = p_user_id);
  
  -- Delete 180 day offers
  DELETE FROM public.plan_180day_offers WHERE user_id = p_user_id;
  
  -- Delete subscriptions
  DELETE FROM public.subscriptions WHERE user_id = p_user_id;
  
  -- Delete vouchers
  DELETE FROM public.vouchers WHERE client_id = p_user_id;
  
  -- Delete rewards
  DELETE FROM public.rewards WHERE user_id = p_user_id;
  
  -- Delete messages
  DELETE FROM public.messages WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  
  -- Delete projects
  DELETE FROM public.projects WHERE user_id = p_user_id;
  
  -- Delete payments
  DELETE FROM public.payments WHERE user_id = p_user_id;
  
  -- Delete payment requests
  DELETE FROM public.payment_requests WHERE user_id = p_user_id;
  
  -- Delete reservations
  DELETE FROM public.reservations WHERE user_id = p_user_id;
  
  -- Delete bookings
  DELETE FROM public.bookings WHERE user_id = p_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Finally delete the profile
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  -- Delete from auth.users (this will cascade to profile if profile still exists)
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN true;
END;
$function$;