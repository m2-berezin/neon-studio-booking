-- Set the two specified emails as admin users
UPDATE public.profiles 
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('ghostwayne777@hotmail.com', 'maximberezin.pro@outlook.com')
);