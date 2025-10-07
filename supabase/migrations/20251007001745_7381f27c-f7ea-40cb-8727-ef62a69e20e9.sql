-- Ensure Ghost Wayne admin has the correct role in profiles
UPDATE public.profiles
SET role = 'admin'
WHERE id = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';