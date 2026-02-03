-- ============================================================
-- SCRIPT DE VERIFICACIÓN Y CONFIGURACIÓN FLASH SALES
-- Ejecuta esto en Supabase SQL Editor
-- ============================================================

-- 1. VERIFICAR Y CREAR CAMPOS (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_flash_sale'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_flash_sale boolean DEFAULT false;
    RAISE NOTICE 'Columna is_flash_sale creada';
  ELSE
    RAISE NOTICE 'Columna is_flash_sale ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'flash_sale_discount'
  ) THEN
    ALTER TABLE public.products ADD COLUMN flash_sale_discount numeric DEFAULT 0;
    RAISE NOTICE 'Columna flash_sale_discount creada';
  ELSE
    RAISE NOTICE 'Columna flash_sale_discount ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'flash_sale_end_time'
  ) THEN
    ALTER TABLE public.products ADD COLUMN flash_sale_end_time timestamp with time zone;
    RAISE NOTICE 'Columna flash_sale_end_time creada';
  ELSE
    RAISE NOTICE 'Columna flash_sale_end_time ya existe';
  END IF;
END $$;

-- 2. CREAR ÍNDICE SI NO EXISTE
CREATE INDEX IF NOT EXISTS idx_products_is_flash_sale 
ON public.products(is_flash_sale) 
WHERE is_flash_sale = true;

-- 3. VERIFICAR Y CREAR ÍNDICE EN app_settings
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- 4. HABILITAR FLASH SALES GLOBALMENTE
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('flash_sale_enabled', 'true'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET 
  value = 'true'::jsonb,
  updated_at = now();

-- 5. VERIFICAR CONFIGURACIÓN
SELECT 'Configuración guardada:' as resultado, key, value 
FROM public.app_settings 
WHERE key = 'flash_sale_enabled';

-- 6. CREAR PRODUCTOS DE EJEMPLO EN FLASH SALE
-- (Toma los primeros 4 productos que existan)
UPDATE public.products
SET 
  is_flash_sale = true,
  flash_sale_discount = 25,
  flash_sale_end_time = now() + interval '24 hours'
WHERE id IN (
  SELECT id FROM public.products 
  ORDER BY created_at DESC 
  LIMIT 4
)
AND is_flash_sale = false;

-- 7. MOSTRAR RESULTADOS
SELECT 
  '📊 RESULTADO FINAL:' as "Estado",
  COUNT(*) as "Productos en Flash Sale",
  MIN(flash_sale_discount) as "Descuento Min %",
  MAX(flash_sale_discount) as "Descuento Max %"
FROM public.products
WHERE is_flash_sale = true;

-- 8. LISTAR PRODUCTOS EN FLASH SALE
SELECT 
  id,
  name,
  price,
  is_flash_sale,
  flash_sale_discount,
  flash_sale_end_time,
  (NOW() + interval '24 hours' > flash_sale_end_time) as "Expirado"
FROM public.products
WHERE is_flash_sale = true
ORDER BY created_at DESC;

-- 9. VERIFICAR SETTINGS
SELECT * FROM public.app_settings WHERE key LIKE 'flash%';
