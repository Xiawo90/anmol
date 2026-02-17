
-- Fix system_settings RLS: allow systemadmin and admindirector to manage settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;

CREATE POLICY "Admins can manage settings" ON public.system_settings
FOR ALL TO authenticated
USING (
  get_user_role(auth.uid()) IN ('admin', 'systemadmin', 'admindirector')
)
WITH CHECK (
  get_user_role(auth.uid()) IN ('admin', 'systemadmin', 'admindirector')
);

-- Create the fee-receipts storage bucket (code references this name)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fee-receipts', 'fee-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for fee-receipts bucket
CREATE POLICY "Authenticated users can upload fee receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fee-receipts');

CREATE POLICY "Authenticated users can view fee receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fee-receipts');

CREATE POLICY "Users can delete own fee receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fee-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
