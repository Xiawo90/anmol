-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-files', 'homework-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-files', 'submission-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-files', 'receipt-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', true);

-- Homework files: teachers/admins upload, all authenticated can view
CREATE POLICY "Anyone can view homework files" ON storage.objects FOR SELECT USING (bucket_id = 'homework-files');
CREATE POLICY "Teachers and admins can upload homework files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'homework-files' AND auth.role() = 'authenticated');
CREATE POLICY "Teachers and admins can update homework files" ON storage.objects FOR UPDATE USING (bucket_id = 'homework-files' AND auth.role() = 'authenticated');
CREATE POLICY "Teachers and admins can delete homework files" ON storage.objects FOR DELETE USING (bucket_id = 'homework-files' AND auth.role() = 'authenticated');

-- Submission files: students upload, authenticated can view
CREATE POLICY "Anyone can view submission files" ON storage.objects FOR SELECT USING (bucket_id = 'submission-files');
CREATE POLICY "Authenticated users can upload submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submission-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update submissions" ON storage.objects FOR UPDATE USING (bucket_id = 'submission-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete submissions" ON storage.objects FOR DELETE USING (bucket_id = 'submission-files' AND auth.role() = 'authenticated');

-- Receipt files: parents/students upload, authenticated can view
CREATE POLICY "Anyone can view receipt files" ON storage.objects FOR SELECT USING (bucket_id = 'receipt-files');
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipt-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'receipt-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipt-files' AND auth.role() = 'authenticated');

-- Study materials: teachers upload, authenticated can view
CREATE POLICY "Anyone can view study materials" ON storage.objects FOR SELECT USING (bucket_id = 'study-materials');
CREATE POLICY "Authenticated users can upload study materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-materials' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update study materials" ON storage.objects FOR UPDATE USING (bucket_id = 'study-materials' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete study materials" ON storage.objects FOR DELETE USING (bucket_id = 'study-materials' AND auth.role() = 'authenticated');