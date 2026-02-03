-- Migration: Add Flash Sale Support to Products
-- Date: 2026-02-03

-- Add flash sale columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_flash_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flash_sale_discount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS flash_sale_end_time timestamp with time zone;

-- Create index for flash sale queries
CREATE INDEX IF NOT EXISTS idx_products_is_flash_sale ON public.products(is_flash_sale) 
WHERE is_flash_sale = true;

-- Add flash sale settings to app_settings
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('flash_sale_enabled', 'true'::jsonb),
  ('flash_sale_duration_hours', '24'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Sample flash sale data (remove or modify as needed)
-- UPDATE public.products 
-- SET is_flash_sale = true, 
--     flash_sale_discount = 20,
--     flash_sale_end_time = now() + interval '24 hours'
-- WHERE id IN (SELECT id FROM products LIMIT 4);
