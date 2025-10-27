-- Drop and recreate delete_own_account function with correct foreign key order
DROP FUNCTION IF EXISTS public.delete_own_account();

CREATE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete in correct order respecting foreign key dependencies
  
  -- 1. Delete point_transactions first (references friend_code_uses and referral_rewards)
  DELETE FROM public.point_transactions WHERE user_id = v_user_id;
  
  -- 2. Delete friend_code_uses (now safe, no references from point_transactions)
  DELETE FROM public.friend_code_uses WHERE used_by = v_user_id;
  
  -- 3. Delete referral_codes
  DELETE FROM public.referral_codes WHERE user_id = v_user_id;
  
  -- 4. Delete referral_rewards
  DELETE FROM public.referral_rewards WHERE user_id = v_user_id;
  
  -- 5. Delete friend_codes
  DELETE FROM public.friend_codes WHERE created_by = v_user_id;
  
  -- 6. Delete user_offers
  DELETE FROM public.user_offers WHERE user_id = v_user_id;
  
  -- 7. Delete loyalty_points
  DELETE FROM public.loyalty_points WHERE user_id = v_user_id;
  
  -- 8. Delete plan_discounts (via subscriptions)
  DELETE FROM public.plan_discounts 
  WHERE subscription_id IN (
    SELECT id FROM public.subscriptions WHERE user_id = v_user_id
  );
  
  -- 9. Delete plan_offers (via subscriptions)
  DELETE FROM public.plan_offers 
  WHERE subscription_id IN (
    SELECT id FROM public.subscriptions WHERE user_id = v_user_id
  );
  
  -- 10. Delete plan_180day_offers
  DELETE FROM public.plan_180day_offers WHERE user_id = v_user_id;
  
  -- 11. Delete subscriptions
  DELETE FROM public.subscriptions WHERE user_id = v_user_id;
  
  -- 12. Delete vouchers where user is client
  DELETE FROM public.vouchers WHERE client_id = v_user_id;
  
  -- 13. Delete rewards
  DELETE FROM public.rewards WHERE user_id = v_user_id;
  
  -- 14. Delete messages (sent or received)
  DELETE FROM public.messages WHERE sender_id = v_user_id OR receiver_id = v_user_id;
  
  -- 15. Delete notifications
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  
  -- 16. Delete projects
  DELETE FROM public.projects WHERE user_id = v_user_id;
  
  -- 17. Delete payments
  DELETE FROM public.payments WHERE user_id = v_user_id;
  
  -- 18. Delete payment_requests
  DELETE FROM public.payment_requests WHERE user_id = v_user_id OR client_id = v_user_id;
  
  -- 19. Delete reservations
  DELETE FROM public.reservations WHERE user_id = v_user_id;
  
  -- 20. Delete bookings
  DELETE FROM public.bookings WHERE user_id = v_user_id;
  
  -- 21. Delete user_roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- 22. Delete profile
  DELETE FROM public.profiles WHERE id = v_user_id;
  
  -- 23. Finally, delete the auth user
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Account deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;