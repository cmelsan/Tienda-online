-- Migración para soporte de Ofertas Flash

-- 1. Añadir columnas a la tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_price INTEGER CHECK (discount_price >= 0),
ADD COLUMN IF NOT EXISTS is_flash_offer BOOLEAN DEFAULT false;

-- 2. Crear índice para búsquedas rápidas de ofertas
CREATE INDEX IF NOT EXISTS idx_products_flash_offer ON products(is_flash_offer) WHERE is_flash_offer = true;

-- 3. (Opcional) Datos de ejemplo: Poner 4 productos en oferta
-- Reemplaza los SLUGS con productos reales de tu tienda si estos no existen
UPDATE products SET is_flash_offer = true, discount_price = price * 0.8 WHERE slug IN (
  'base-maquillaje-luminosa', 
  'champu-reparador-intensivo', 
  'eau-de-parfum-floral', 
  'crema-corporal-hidratante'
);
