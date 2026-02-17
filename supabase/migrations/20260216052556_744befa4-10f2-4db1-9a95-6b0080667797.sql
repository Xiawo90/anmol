
-- Add attachment_urls column to homework table
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';
