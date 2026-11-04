-- =====================================================================
-- 1. Who is an admin. is_admin() read profiles.role, which clients can
--    edit on their own row, so anyone could make themselves an admin.
--    user_roles can only be changed by admins, and the app already uses it.
-- =====================================================================
DO $$
BEGIN
  -- Otherwise the studio would be locked out of every admin function
  IF NOT public.check_user_role('6d9d1dc1-e16f-4f3d-a817-1591a1b27477', 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'The studio admin is missing from user_roles';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_user_role(auth.uid(), 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_user_role(uid, 'admin'::public.app_role);
$$;

-- Accounts marked as admin without being one
UPDATE public.profiles p
SET role = 'client'
WHERE p.role = 'admin'
  AND NOT public.check_user_role(p.id, 'admin'::public.app_role);

-- Some older functions and policies read profiles.role directly, and the balance is
-- only meant to follow the transactions. Functions that run as their owner aren't affected.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
    AND NOT public.check_user_role(auth.uid(), 'admin'::public.app_role) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'client';
      NEW.points_balance := 0;
    ELSE
      NEW.role := OLD.role;
      NEW.points_balance := OLD.points_balance;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- =====================================================================
-- 2. Anyone could give or spend diamonds, or abandon an offer reservation,
--    by calling these functions directly, even without being signed in.
--    Functions that use them internally run as their owner and keep working.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_award_points(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can award diamonds';
  END IF;

  RETURN award_points(p_user_id, p_amount, p_transaction_type);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_award_points(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_award_points(uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text, timestamptz, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.use_points(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.abandon_offer(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res_record RECORD;
  v_current_month date;
BEGIN
  SELECT * INTO v_res_record
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  -- Only the client it belongs to, or an admin rejecting the payment
  IF v_res_record.id IS NULL OR (v_res_record.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;

  -- Mark reservation as abandoned
  UPDATE public.reservations
  SET status = 'abandoned'
  WHERE id = p_reservation_id;

  -- If it's a 180-day offer reservation (no offer_id but has the snapshot name pattern)
  IF v_res_record.service_name_snapshot ILIKE '%Oferta Plano%180 dias%' THEN
    -- Reset the plan_180day_offers record so user can claim again
    DELETE FROM public.plan_180day_offers
    WHERE user_id = v_res_record.user_id AND is_claimed = false;

    RETURN true;
  END IF;

  -- Regular offer flow
  IF v_res_record.offer_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não tem oferta associada';
  END IF;

  v_current_month := date_trunc('month', v_res_record.created_at);

  UPDATE public.user_offers
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE user_id = v_res_record.user_id
    AND offer_id = v_res_record.offer_id
    AND month_year = v_current_month;

  DELETE FROM public.user_offers
  WHERE user_id = v_res_record.user_id
    AND offer_id = v_res_record.offer_id
    AND month_year = v_current_month
    AND used_count = 0;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abandon_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_offer(uuid) TO authenticated;