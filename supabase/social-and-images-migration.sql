-- ============================================================
-- Djola TikTak — Social links + Service images migration
-- ============================================================

-- 1. Social media links on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS website_url TEXT DEFAULT NULL;

-- 2. Image URL on services
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- 3. Storage buckets (run in Supabase Dashboard → SQL Editor)
-- These are idempotent
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true),
       ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies — anyone can view, only authenticated users can upload
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "service_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');

CREATE POLICY "service_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-images' AND auth.role() = 'authenticated');

CREATE POLICY "service_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');

CREATE POLICY "service_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');
