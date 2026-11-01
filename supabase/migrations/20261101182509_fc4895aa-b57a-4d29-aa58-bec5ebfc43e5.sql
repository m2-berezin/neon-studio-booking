REVOKE EXECUTE ON FUNCTION public.send_push_on_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.device_tokens_set_updated_at() FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.device_tokens IS 'Intentional RLS deny-all for direct client access; only service_role and authenticated token registration functions access device tokens.';
COMMENT ON FUNCTION public.get_admin_avatar(uuid) IS 'Intentional authenticated SECURITY DEFINER API: returns only avatar_url for an administrator validated against public.user_roles.';
COMMENT ON FUNCTION public.register_device_token(text, text) IS 'Intentional authenticated SECURITY DEFINER API: requires auth.uid() and binds the supplied device token only to the caller.';
COMMENT ON FUNCTION public.unregister_device_token(text) IS 'Intentional authenticated SECURITY DEFINER API: removes only a token owned by auth.uid().';