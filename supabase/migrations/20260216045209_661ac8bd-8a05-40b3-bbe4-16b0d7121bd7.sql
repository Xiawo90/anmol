
-- Add location column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location text;
