-- Membuat tabel store_settings
CREATE TABLE public.store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Hanya boleh ada 1 baris pengaturan
  store_name TEXT NOT NULL DEFAULT 'Djiharkah Store',
  description TEXT NOT NULL DEFAULT 'Pusat busana muslim eksklusif yang menyajikan kemewahan dan kenyamanan dalam setiap helai kain untuk menyempurnakan ibadah Anda.',
  email TEXT NOT NULL DEFAULT 'support@djiharkah.com',
  phone TEXT NOT NULL DEFAULT '+62 812 3456 7890',
  instagram TEXT DEFAULT '@djiharkah.store',
  whatsapp_text TEXT DEFAULT 'WhatsApp Kami',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Store settings are viewable by everyone" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update store settings" ON public.store_settings FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can insert store settings" ON public.store_settings FOR INSERT WITH CHECK (is_admin());

-- Insert default row if not exists
INSERT INTO public.store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER set_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
