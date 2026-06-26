-- Jadikan akun admin@djiharkah.com sebagai Admin di database
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@djiharkah.com'
);
