-- Migration: Add return-related fields to orders table
-- This migration adds support for the return requests system

-- Add columns to orders table if they don't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS return_initiated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS return_deadline_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS return_address jsonb,
ADD COLUMN IF NOT EXISTS return_reason text;

-- Create index on return_initiated_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_return_initiated_at 
ON public.orders(return_initiated_at);

-- Create index on return_deadline_at for finding expired returns
CREATE INDEX IF NOT EXISTS idx_orders_return_deadline_at 
ON public.orders(return_deadline_at);
