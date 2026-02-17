
-- Add missing columns to fee_payment_receipts
ALTER TABLE public.fee_payment_receipts 
ADD COLUMN IF NOT EXISTS reviewed_by uuid,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Add invoice columns to fee_records for admin-uploaded invoices
ALTER TABLE public.fee_records
ADD COLUMN IF NOT EXISTS invoice_url text,
ADD COLUMN IF NOT EXISTS invoice_file_name text;
