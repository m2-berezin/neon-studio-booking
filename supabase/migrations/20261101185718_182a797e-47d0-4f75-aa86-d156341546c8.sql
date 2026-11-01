REVOKE EXECUTE ON FUNCTION public.request_reschedule(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_decide_reschedule(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC, anon;