-- Storage buckets for profile pictures and team badges.
-- STEP 1: Create the buckets manually in Supabase Dashboard > Storage > New bucket:
--   - Name: "avatars"      | Public: YES
--   - Name: "team-badges"  | Public: YES
--
-- STEP 2: Run this SQL to set the access policies.

-- Avatars: anyone authenticated can read; owner can upload/update their own file
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Team badges: anyone authenticated can read; any authenticated user can upload
CREATE POLICY "team_badges_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-badges');

CREATE POLICY "team_badges_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-badges' AND auth.role() = 'authenticated'
  );

CREATE POLICY "team_badges_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'team-badges' AND auth.role() = 'authenticated'
  );
