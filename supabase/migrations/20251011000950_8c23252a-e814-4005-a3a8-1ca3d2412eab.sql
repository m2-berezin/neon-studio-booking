-- Add hidden columns to bookings and payment_requests
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS hidden_from_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_from_admin boolean DEFAULT false;

ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS hidden_from_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_from_admin boolean DEFAULT false;

-- Update get_client_mixmaster_projects to filter hidden from client
CREATE OR REPLACE FUNCTION public.get_client_mixmaster_projects(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  service_name text,
  amount_eur numeric,
  status text,
  created_at timestamp with time zone,
  transfer_link text,
  note text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    pr.id,
    COALESCE(r.service_name_snapshot, 'Mix&Master') as service_name,
    pr.amount_eur,
    pr.status,
    pr.created_at,
    pr.transfer_link,
    pr.note
  FROM public.payment_requests pr
  LEFT JOIN public.reservations r ON r.id = pr.reservation_id
  WHERE pr.user_id = p_user_id
    AND pr.type = 'mixmaster'
    AND pr.hidden_from_client = false
  ORDER BY pr.created_at DESC;
$function$;

-- Update client_delete_project to mark as hidden instead of deleting
CREATE OR REPLACE FUNCTION public.client_delete_project(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_booking boolean;
BEGIN
  -- Check if it's a regular booking
  SELECT user_id INTO v_user_id
  FROM public.bookings
  WHERE id = p_booking_id AND user_id = auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    -- Hide booking from client
    UPDATE public.bookings
    SET hidden_from_client = true
    WHERE id = p_booking_id AND user_id = auth.uid();
    RETURN true;
  END IF;
  
  -- Check if it's a Mix & Master payment request
  SELECT user_id INTO v_user_id
  FROM public.payment_requests
  WHERE id = p_booking_id AND user_id = auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    -- Hide payment request from client
    UPDATE public.payment_requests
    SET hidden_from_client = true
    WHERE id = p_booking_id AND user_id = auth.uid();
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Create function for admin to hide projects
CREATE OR REPLACE FUNCTION public.admin_hide_project(p_project_id uuid, p_project_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can hide projects';
  END IF;
  
  IF p_project_type = 'booking' THEN
    UPDATE public.bookings
    SET hidden_from_admin = true
    WHERE id = p_project_id;
  ELSIF p_project_type = 'mixmaster' THEN
    UPDATE public.payment_requests
    SET hidden_from_admin = true
    WHERE id = p_project_id;
  ELSE
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;