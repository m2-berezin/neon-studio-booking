-- =====================================================================
-- 1. Marking a chat as read
--    Goes through this function so it works whatever the table's update
--    permissions are, and only ever touches the read flag.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.mark_chat_read(p_other_user_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE messages
  SET is_read = true
  WHERE receiver_id = auth.uid()
    AND sender_id = p_other_user_id
    AND is_read = false;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_chat_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid) TO authenticated;

-- =====================================================================
-- 2. The admin already gets "Recebeu uma mensagem" for each client
--    message. Without this every message also sent "Nova mensagem",
--    meaning two banners for one message.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  IF has_role(NEW.receiver_id, 'admin') THEN
    RETURN NEW;
  END IF;

  -- Get sender's name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Create notification for the receiver
  INSERT INTO public.notifications (user_id, role, title, body)
  VALUES (
    NEW.receiver_id,
    'user',
    'Nova mensagem',
    'Recebeste uma nova mensagem de ' || COALESCE(sender_name, 'alguém')
  );

  RETURN NEW;
END;
$$;

-- =====================================================================
-- 3. A client's email for the admin's client profile. Emails live in
--    auth.users, which the app can't read directly.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_client_email(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can see client contacts';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_client_id;
  RETURN v_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_client_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_client_email(uuid) TO authenticated;

-- =====================================================================
-- 4. New vouchers are worth 10€. Already claimed vouchers keep their value.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.claim_voucher(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status jsonb;
  v_voucher_id uuid;
BEGIN
  -- Check if voucher is available
  v_status := public.get_voucher_status(p_user_id);
  
  IF NOT (v_status->>'available')::boolean THEN
    RAISE EXCEPTION 'Voucher ainda não disponível. Faltam % dias.', v_status->>'days_left';
  END IF;
  
  -- Create voucher without expiration (will be inactivated when used)
  INSERT INTO public.vouchers (client_id, amount_eur, code, expires_at)
  VALUES (p_user_id, 10.00, 'VOUCHER10-' || gen_random_uuid()::text, NULL)
  RETURNING id INTO v_voucher_id;
  
  -- Update last_voucher_at to NOW to start the 90-day countdown for next voucher
  UPDATE public.profiles
  SET last_voucher_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_voucher_id;
END;
$$;

