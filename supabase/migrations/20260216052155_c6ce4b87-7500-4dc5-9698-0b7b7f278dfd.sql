
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to assignments bucket
CREATE POLICY "Authenticated users can upload to assignments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assignments');

-- Allow anyone to read from assignments bucket (public)
CREATE POLICY "Anyone can read assignments"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignments');

-- Allow owners to delete their assignments files
CREATE POLICY "Users can delete own assignments files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload to study-materials bucket
CREATE POLICY "Authenticated users can upload to study-materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study-materials');

-- Allow anyone to read from study-materials bucket (public)
CREATE POLICY "Anyone can read study-materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-materials');

-- Allow owners to delete their study-materials files
CREATE POLICY "Users can delete own study-materials files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload to submissions bucket
CREATE POLICY "Authenticated users can upload to submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions');

-- Allow anyone to read from submissions bucket (public)
CREATE POLICY "Anyone can read submissions"
ON storage.objects FOR SELECT
USING (bucket_id = 'submissions');

-- Allow owners to delete their submissions files
CREATE POLICY "Users can delete own submissions files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);
