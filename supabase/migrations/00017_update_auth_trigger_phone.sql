-- Perbarui trigger function untuk mengambil phone_number dari metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
BEGIN
  -- Secara default, admin@djiharkah.com akan otomatis menjadi admin
  -- Sisanya menjadi customer
  IF NEW.email = 'admin@djiharkah.com' THEN
    assigned_role := 'admin'::public.user_role;
  ELSE
    assigned_role := 'customer'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, role, full_name, phone_number)
  VALUES (
    NEW.id, 
    assigned_role, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
