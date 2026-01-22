-- 1. Crear tabla de Subcategorías
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slug, category_id)
);

-- 2. Añadir columna a Productos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;

-- 3. Habilitar Seguridad (RLS)
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subcategories" 
ON subcategories FOR SELECT 
USING (true);

CREATE POLICY "Admin manage subcategories" 
ON subcategories FOR ALL 
USING (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');

-- 4. Insertar Subcategorías Iniciales (Datos de Ejemplo)
DO $$
DECLARE
  v_maquillaje_id UUID;
  v_cabello_id UUID;
  v_cuerpo_id UUID;
  v_perfumes_id UUID;
BEGIN
  -- Obtener IDs de categorías padres
  SELECT id INTO v_maquillaje_id FROM categories WHERE slug = 'maquillaje';
  SELECT id INTO v_cabello_id FROM categories WHERE slug = 'cabello';
  SELECT id INTO v_cuerpo_id FROM categories WHERE slug = 'cuerpo';
  SELECT id INTO v_perfumes_id FROM categories WHERE slug = 'perfumes';
  
  -- Insertar si existen las categorías
  IF v_maquillaje_id IS NOT NULL THEN
    INSERT INTO subcategories (name, slug, category_id) VALUES
    ('Rostro', 'rostro', v_maquillaje_id),
    ('Labios', 'labios', v_maquillaje_id),
    ('Ojos', 'ojos', v_maquillaje_id),
    ('Cejas', 'cejas', v_maquillaje_id),
    ('Brochas y Accesorios', 'brochas-y-accesorios', v_maquillaje_id)
    ON CONFLICT (slug, category_id) DO NOTHING;
  END IF;

  IF v_cabello_id IS NOT NULL THEN
    INSERT INTO subcategories (name, slug, category_id) VALUES
    ('Champú', 'champu', v_cabello_id),
    ('Acondicionador', 'acondicionador', v_cabello_id),
    ('Tratamientos', 'tratamientos', v_cabello_id),
    ('Styling', 'styling', v_cabello_id)
    ON CONFLICT (slug, category_id) DO NOTHING;
  END IF;
  
   IF v_cuerpo_id IS NOT NULL THEN
    INSERT INTO subcategories (name, slug, category_id) VALUES
    ('Hidratación', 'hidratacion', v_cuerpo_id),
    ('Exfoliantes', 'exfoliantes', v_cuerpo_id),
    ('Solar', 'solar', v_cuerpo_id)
    ON CONFLICT (slug, category_id) DO NOTHING;
  END IF;
  
   IF v_perfumes_id IS NOT NULL THEN
    INSERT INTO subcategories (name, slug, category_id) VALUES
    ('Mujer', 'mujer', v_perfumes_id),
    ('Hombre', 'hombre', v_perfumes_id),
    ('Unisex', 'unisex', v_perfumes_id)
    ON CONFLICT (slug, category_id) DO NOTHING;
  END IF;
END $$;
