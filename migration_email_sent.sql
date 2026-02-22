-- Migration: add email_sent flag to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- Index for quick lookup (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_orders_email_sent ON orders(email_sent) WHERE email_sent = FALSE;
