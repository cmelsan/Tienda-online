-- ÉCLAT Beauty E-commerce Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster slug lookups
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0), -- Price in cents
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Categories: Public read access
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Categories: Admin write access
CREATE POLICY "Categories are editable by admins only"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');

-- Products: Public read access
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

-- Products: Admin write access
CREATE POLICY "Products are editable by admins only"
  ON products FOR ALL
  USING (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');

-- ============================================
-- SEED DATA - Categories
-- ============================================
INSERT INTO categories (name, slug, description) VALUES
  ('Maquillaje', 'maquillaje', 'Productos de maquillaje premium para realzar tu belleza natural'),
  ('Cabello', 'cabello', 'Cuidado capilar profesional para todo tipo de cabello'),
  ('Cuerpo', 'cuerpo', 'Productos de cuidado corporal y bienestar'),
  ('Perfumes', 'perfumes', 'Fragancias exclusivas y sofisticadas')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA - Sample Products
-- ============================================
-- Note: Replace image URLs with actual Supabase Storage URLs after upload

-- Maquillaje products
INSERT INTO products (name, slug, description, price, stock, category_id, images) VALUES
  (
    'Base de Maquillaje Luminosa',
    'base-maquillaje-luminosa',
    'Base de maquillaje de cobertura media con acabado luminoso. Fórmula hidratante enriquecida con vitamina E para un cutis radiante y natural.',
    4500, -- 45.00 EUR
    25,
    (SELECT id FROM categories WHERE slug = 'maquillaje'),
    ARRAY['https://placeholder-image-url.com/base-1.jpg']
  ),
  (
    'Paleta de Sombras Nude',
    'paleta-sombras-nude',
    'Paleta de 12 tonos nude esenciales. Texturas cremosas y altamente pigmentadas para looks desde naturales hasta sofisticados.',
    5900,
    15,
    (SELECT id FROM categories WHERE slug = 'maquillaje'),
    ARRAY['https://placeholder-image-url.com/paleta-1.jpg']
  );

-- Cabello products
INSERT INTO products (name, slug, description, price, stock, category_id, images) VALUES
  (
    'Champú Reparador Intensivo',
    'champu-reparador-intensivo',
    'Champú profesional para cabello dañado. Fórmula con keratina y aceite de argán que restaura la fibra capilar desde la primera aplicación.',
    3200,
    30,
    (SELECT id FROM categories WHERE slug = 'cabello'),
    ARRAY['https://placeholder-image-url.com/champu-1.jpg']
  ),
  (
    'Mascarilla Nutritiva Premium',
    'mascarilla-nutritiva-premium',
    'Tratamiento intensivo que nutre y suaviza el cabello. Enriquecida con aceites naturales y proteínas vegetales.',
    4200,
    20,
    (SELECT id FROM categories WHERE slug = 'cabello'),
    ARRAY['https://placeholder-image-url.com/mascarilla-1.jpg']
  );

-- Cuerpo products
INSERT INTO products (name, slug, description, price, stock, category_id, images) VALUES
  (
    'Crema Corporal Hidratante',
    'crema-corporal-hidratante',
    'Crema corporal de absorción rápida con manteca de karité y vitamina E. Hidratación profunda durante 24 horas.',
    2800,
    40,
    (SELECT id FROM categories WHERE slug = 'cuerpo'),
    ARRAY['https://placeholder-image-url.com/crema-1.jpg']
  ),
  (
    'Exfoliante Corporal Suave',
    'exfoliante-corporal-suave',
    'Exfoliante con micropartículas naturales que elimina células muertas dejando la piel suave y renovada.',
    3500,
    18,
    (SELECT id FROM categories WHERE slug = 'cuerpo'),
    ARRAY['https://placeholder-image-url.com/exfoliante-1.jpg']
  );

-- Perfumes products
INSERT INTO products (name, slug, description, price, stock, category_id, images) VALUES
  (
    'Eau de Parfum Floral',
    'eau-de-parfum-floral',
    'Fragancia femenina con notas de jazmín, rosa y vainilla. Elegante y sofisticada, perfecta para cualquier ocasión.',
    8900,
    12,
    (SELECT id FROM categories WHERE slug = 'perfumes'),
    ARRAY['https://placeholder-image-url.com/perfume-1.jpg']
  ),
  (
    'Eau de Toilette Fresh',
    'eau-de-toilette-fresh',
    'Fragancia fresca y ligera con notas cítricas y acuáticas. Ideal para el día a día.',
    6500,
    22,
    (SELECT id FROM categories WHERE slug = 'perfumes'),
    ARRAY['https://placeholder-image-url.com/perfume-2.jpg']
  );

-- ============================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================
-- Run this in Supabase Dashboard > Storage

-- 1. Create bucket 'products-images'
-- 2. Set as public bucket
-- 3. Add policy for public read:
--    CREATE POLICY "Public read access"
--    ON storage.objects FOR SELECT
--    USING (bucket_id = 'products-images');
--
-- 4. Add policy for authenticated upload:
--    CREATE POLICY "Authenticated users can upload"
--    ON storage.objects FOR INSERT
--    WITH CHECK (bucket_id = 'products-images' AND auth.role() = 'authenticated');
--
-- 5. Add policy for authenticated delete:
--    CREATE POLICY "Authenticated users can delete"
--    ON storage.objects FOR DELETE
--    USING (bucket_id = 'products-images' AND auth.role() = 'authenticated');
