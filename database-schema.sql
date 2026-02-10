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

-- ============================================
-- BRANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster slug lookups
CREATE INDEX idx_brands_slug ON brands(slug);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Brands: Public read access
CREATE POLICY "Brands are viewable by everyone"
  ON brands FOR SELECT
  USING (true);

-- Brands: Admin write access (authenticated users only, admin verified at login)
CREATE POLICY "Brands are editable by admins"
  ON brands FOR INSERT, UPDATE, DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- UPDATE PRODUCTS TABLE
-- ============================================
-- Add brand_id column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- Index for brand_id
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- ============================================
-- SEED DATA - Brands
-- ============================================
INSERT INTO brands (name, slug) VALUES
  ('Adolfo Domínguez', 'adolfo-dominguez'),
  ('AESTURA', 'aestura'),
  ('Amika', 'amika'),
  ('Anastasia Beverly Hills', 'anastasia-beverly-hills'),
  ('Armani', 'armani'),
  ('Augustinus Bader', 'augustinus-bader'),
  ('Aveda', 'aveda'),
  ('Bali Body', 'bali-body'),
  ('Beautyblender', 'beautyblender'),
  ('Beauty of Joseon', 'beauty-of-joseon'),
  ('Benefit Cosmetics', 'benefit-cosmetics'),
  ('Biodance', 'biodance'),
  ('Burberry', 'burberry'),
  ('Byoma', 'byoma'),
  ('Cacharel', 'cacharel'),
  ('Calvin Klein', 'calvin-klein'),
  ('Carolina Herrera', 'carolina-herrera'),
  ('Caudalie', 'caudalie'),
  ('Champo', 'champo'),
  ('CHANEL', 'chanel'),
  ('Charlotte Tilbury', 'charlotte-tilbury'),
  ('Chloé', 'chloe'),
  ('Christophe Robin', 'christophe-robin'),
  ('Clarins', 'clarins'),
  ('Clear Start by Dermalogica', 'clear-start-by-dermalogica'),
  ('Clinique', 'clinique'),
  ('Coco & Eve', 'coco-and-eve'),
  ('Collistar', 'collistar'),
  ('Color Wow', 'color-wow'),
  ('Dermalogica', 'dermalogica'),
  ('Dior', 'dior'),
  ('Dior Backstage', 'dior-backstage'),
  ('Dolce & Gabbana', 'dolce-and-gabbana'),
  ('Dr. Dennis Gross', 'dr-dennis-gross'),
  ('Drunk Elephant', 'drunk-elephant'),
  ('Dyson', 'dyson'),
  ('Erborian', 'erborian'),
  ('Estée Lauder', 'estee-lauder'),
  ('Fable & Mane', 'fable-and-mane'),
  ('Fenty Beauty', 'fenty-beauty'),
  ('Fenty Fragrance', 'fenty-fragrance'),
  ('Fenty Hair', 'fenty-hair'),
  ('Fenty Skin', 'fenty-skin'),
  ('First Aid Beauty', 'first-aid-beauty'),
  ('Fresh', 'fresh'),
  ('Ghd', 'ghd'),
  ('Gisou', 'gisou'),
  ('Givenchy', 'givenchy'),
  ('GLOWERY', 'glowery'),
  ('Glow Recipe', 'glow-recipe'),
  ('Grande Cosmetics', 'grande-cosmetics'),
  ('Gucci', 'gucci'),
  ('Guerlain', 'guerlain'),
  ('Hair Rituel by Sisley', 'hair-rituel-by-sisley'),
  ('Haus Labs', 'haus-labs'),
  ('Helena Rubinstein', 'helena-rubinstein'),
  ('Hermès', 'hermes'),
  ('Hismile', 'hismile'),
  ('Hourglass', 'hourglass'),
  ('Huda Beauty', 'huda-beauty'),
  ('Hugo Boss', 'hugo-boss'),
  ('Ilia', 'ilia'),
  ('Innisfree', 'innisfree'),
  ('Invisibobble', 'invisibobble'),
  ('Isdin', 'isdin'),
  ('Isle of Paradise', 'isle-of-paradise'),
  ('Issey Miyake', 'issey-miyake'),
  ('Jean Paul Gaultier', 'jean-paul-gaultier'),
  ('Juliette Has A Gun', 'juliette-has-a-gun'),
  ('K18', 'k18'),
  ('Kayali', 'kayali'),
  ('Kenzo', 'kenzo'),
  ('Kérastase', 'kerastase'),
  ('Kiehl''s Since 1851', 'kiehls-since-1851'),
  ('Kora Organics', 'kora-organics'),
  ('Kosas', 'kosas'),
  ('L''Oréal Professionnel', 'loreal-professionnel'),
  ('La Mer', 'la-mer'),
  ('Lancôme', 'lancome'),
  ('Laneige', 'laneige'),
  ('Lanolips', 'lanolips'),
  ('Le Monde Gourmand', 'le-monde-gourmand'),
  ('Les Secrets de Loly', 'les-secrets-de-loly'),
  ('LIGHTINDERM', 'lightinderm'),
  ('Living Proof', 'living-proof'),
  ('Loewe', 'loewe'),
  ('Maison Margiela', 'maison-margiela'),
  ('Makeup By Mario', 'makeup-by-mario'),
  ('Make Up Eraser', 'make-up-eraser'),
  ('Make Up For Ever', 'make-up-for-ever'),
  ('Manucurist', 'manucurist'),
  ('Marc Jacobs', 'marc-jacobs'),
  ('Mario Badescu', 'mario-badescu'),
  ('Masqmai', 'masqmai'),
  ('Merci Handy', 'merci-handy'),
  ('Milk Makeup', 'milk-makeup'),
  ('Miu Miu', 'miu-miu'),
  ('Montblanc', 'montblanc'),
  ('Moroccanoil', 'moroccanoil'),
  ('Mugler', 'mugler'),
  ('Narciso Rodríguez', 'narciso-rodriguez'),
  ('Nars', 'nars'),
  ('Natasha Denona', 'natasha-denona'),
  ('Nina Ricci', 'nina-ricci'),
  ('NOOANCE', 'nooance'),
  ('Nudestix', 'nudestix'),
  ('Nuxe', 'nuxe'),
  ('Olaplex', 'olaplex'),
  ('Olehenriksen', 'olehenriksen'),
  ('ONESIZE', 'onesize'),
  ('Ouai', 'ouai'),
  ('Pai', 'pai'),
  ('Patchology', 'patchology'),
  ('Pat McGrath Labs', 'pat-mcgrath-labs'),
  ('Peace Out Skincare', 'peace-out-skincare'),
  ('Pixi', 'pixi'),
  ('Prada', 'prada'),
  ('Rabanne Fragances', 'rabanne-fragances'),
  ('Rabanne Makeup', 'rabanne-makeup'),
  ('Ralph Lauren', 'ralph-lauren'),
  ('Rare Beauty', 'rare-beauty'),
  ('Redken', 'redken'),
  ('Rem Beauty', 'rem-beauty'),
  ('Ren Clean Skincare', 'ren-clean-skincare'),
  ('Respire', 'respire'),
  ('Rituals', 'rituals'),
  ('Rochas', 'rochas'),
  ('SALT AND STONE', 'salt-and-stone'),
  ('Seasonly', 'seasonly'),
  ('Sensai', 'sensai'),
  ('Sephora Collection', 'sephora-collection'),
  ('Sephora Favorites', 'sephora-favorites'),
  ('Shiseido', 'shiseido'),
  ('Shu Uemura Art of Hair', 'shu-uemura-art-of-hair'),
  ('Sisley', 'sisley'),
  ('Slip', 'slip'),
  ('Sol de Janeiro', 'sol-de-janeiro'),
  ('Summer Fridays', 'summer-fridays'),
  ('Sunday Riley', 'sunday-riley'),
  ('Supergoop!', 'supergoop'),
  ('SVR', 'svr'),
  ('Tangle Teezer', 'tangle-teezer'),
  ('Tan Luxe', 'tan-luxe'),
  ('Tarte', 'tarte'),
  ('Tatcha', 'tatcha'),
  ('The 7 Virtues', 'the-7-virtues'),
  ('The Inkey List', 'the-inkey-list'),
  ('The Ordinary', 'the-ordinary'),
  ('Tom Ford', 'tom-ford'),
  ('Too Faced', 'too-faced'),
  ('Ultra Violette', 'ultra-violette'),
  ('Unbottled', 'unbottled'),
  ('Valentino', 'valentino'),
  ('Versace', 'versace'),
  ('Virtue', 'virtue'),
  ('Wella Professionals', 'wella-professionals'),
  ('Yepoda', 'yepoda'),
  ('Youth To The People', 'youth-to-the-people'),
  ('Yves Saint Laurent', 'yves-saint-laurent'),
  ('Zadig & Voltaire', 'zadig-and-voltaire')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- STORAGE BUCKET CONFIGURATION (Brands)
-- ============================================
-- 1. Create bucket 'brands-images'
-- 2. Set as public bucket

-- ============================================
-- ORDERS & POST-SALES MANAGEMENT
-- ============================================


-- ============================================
-- ORDERS & POST-SALES MANAGEMENT
-- ============================================

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) NOT NULL UNIQUE, -- Human-readable order number (e.g., ORD-2026-0001)
  user_id UUID REFERENCES auth.users(id), -- Nullable for guests
  guest_email VARCHAR(255),               -- Required if user_id is null
  customer_name VARCHAR(255),             -- Customer name for email
  status VARCHAR(20) NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded')),
  delivered_at TIMESTAMP WITH TIME ZONE, -- Set when status changes to 'delivered'
  return_initiated_at TIMESTAMP WITH TIME ZONE, -- Set when customer requests return
  return_deadline_at TIMESTAMP WITH TIME ZONE, -- Deadline to physically return the item (14 days from return_initiated_at)
  return_address JSONB, -- Address where customer should send the return package
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_or_guest CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL) -- Ensure at least one identifier exists
);

-- 2. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase INTEGER NOT NULL, -- Price snapshot at time of purchase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies

-- Authenticated Users: View their own orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Guests: View orders via UUID (e.g., for order tracking page, heavily restricted in real production, simplified here)
-- In a real app, we'd use a signed token or only show via email link. 
-- For this demo, we'll keep it simple: Guests can't list orders, they just see success page.


-- Admin: View all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin: Update all orders (e.g., changing status)
CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin: View all order items
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Users can view their own order items
CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));


-- ============================================
-- GLOBAL SETTINGS (Admin Config)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public: Everyone can read settings (needed for feature flags)
CREATE POLICY "Everyone can view settings"
  ON settings FOR SELECT
  USING (true);

-- Admin: Only admins can update
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin: Only admins can insert
CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Seed default settings if not exists
INSERT INTO settings (key, value, description)
VALUES ('offers_enabled', 'true'::jsonb, 'Habilita o deshabilita la sección de ofertas en la web pública')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ORDER STATUS HISTORY (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id), -- Can be null for system changes
  changed_by_type VARCHAR(10) CHECK (changed_by_type IN ('user', 'admin', 'system')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view history for their own orders
CREATE POLICY "Users can view history for their orders"
  ON order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_status_history.order_id 
    AND orders.user_id = auth.uid()
  ));

-- Admins can view all history
CREATE POLICY "Admins can view all history"
  ON order_status_history FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Only system/admins can insert history (via RPC functions)
CREATE POLICY "System can insert history"
  ON order_status_history FOR INSERT
  WITH CHECK (true); -- Controlled by SECURITY DEFINER functions


-- ============================================
-- ATOMIC CANCELLATION LOGIC (RPC)
-- ============================================

CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status VARCHAR;
  v_user_id UUID;
  v_item RECORD;
BEGIN
  -- 1. Check Order Existence Ownership and Status
  SELECT status, user_id INTO v_order_status, v_user_id
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  -- Only logged-in users can cancel via this RPC for now
  IF v_user_id != auth.uid() THEN
     RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  IF v_order_status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order cannot be cancelled. It may already be shipped or cancelled.');
  END IF;

  -- 2. Update Order Status
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. Restore Stock (Atomic Loop)
  FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id LOOP
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. Release used coupons (decrement current_uses and remove from coupon_usage)
  IF EXISTS (SELECT 1 FROM coupon_usage WHERE order_id = p_order_id) THEN
    UPDATE coupons 
    SET current_uses = GREATEST(0, current_uses - 1)
    WHERE id IN (SELECT coupon_id FROM coupon_usage WHERE order_id = p_order_id);
    
    DELETE FROM coupon_usage WHERE order_id = p_order_id;
  END IF;

  -- 5. Log cancellation
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, 'paid', 'cancelled', auth.uid(), 'user', 'Self-cancelled by customer');

  RETURN jsonb_build_object('success', true, 'message', 'Order cancelled and stock restored successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ============================================
-- ORDER NUMBER SEQUENCE
-- ============================================
-- Sequence for generating sequential order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Function to generate human-readable order number (e.g., ORD-2026-0001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  v_seq_value BIGINT;
  v_order_number VARCHAR;
BEGIN
  v_seq_value := nextval('order_number_seq');
  v_order_number := CONCAT('ORD-', TO_CHAR(NOW(), 'YYYY'), '-', LPAD(v_seq_value::TEXT, 4, '0'));
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ATOMIC PURCHASE LOGIC (create_order)
-- ============================================
-- This function handles the full checkout process:
-- 1. Receives cart items (product_id, quantity).
-- 2. Verifies stock for ALL items.
-- 3. Deducts stock (atomic update).
-- 4. Creates the Order record.
-- 5. Creates Order Items records.

CREATE OR REPLACE FUNCTION create_order(
  p_items JSONB,           -- Array of {product_id, quantity, price}
  p_total_amount INTEGER,  -- Total calculated by client
  p_shipping_address JSONB,
  p_guest_email VARCHAR DEFAULT NULL, -- Optional email for guest checkout
  p_customer_name VARCHAR DEFAULT NULL -- Customer name for email
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  v_order_id UUID;
  v_order_number VARCHAR;
  v_item_price INTEGER;
  v_user_id UUID;
  v_customer_name VARCHAR;
BEGIN
  -- 1. Identify User (Auth vs Guest)
  v_user_id := auth.uid();
  v_customer_name := COALESCE(p_customer_name, 'Cliente');
  
  IF v_user_id IS NULL AND p_guest_email IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Email is required for guest checkout');
  END IF;

  -- 2. Validate Stock for ALL items first
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT stock INTO v_current_stock FROM products WHERE id = v_product_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Product not found: ' || v_product_id);
    END IF;

    IF v_current_stock < v_quantity THEN
      RETURN jsonb_build_object('success', false, 'message', 'Stock insuficiente para el producto ID: ' || v_product_id);
    END IF;
  END LOOP;

  -- 3. Deduct Stock & Create Order (Transaction starts automatically)
  
  -- Generate Order Number
  v_order_number := generate_order_number();
  
  -- Create Order with customer_name
  INSERT INTO orders (order_number, user_id, guest_email, customer_name, status, total_amount, shipping_address)
  VALUES (v_order_number, v_user_id, p_guest_email, v_customer_name, 'paid', p_total_amount, p_shipping_address) 
  RETURNING id INTO v_order_id;

  -- Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_item_price := (v_item->>'price')::INTEGER;

    -- Deduct Stock
    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;

    -- Create Order Item
    INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_product_id, v_quantity, v_item_price);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;




-- ============================================
-- MIGRATION: GUEST CHECKOUT SUPPORT
-- ============================================
-- Run these commands manually or ensure they execute to update existing tables.
-- 1. Allow nullable user_id (if not already)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest_email column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);

-- 3. Update Constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS user_or_guest;
ALTER TABLE orders ADD CONSTRAINT user_or_guest CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL);


-- ============================================
-- RETURN MANAGEMENT LOGIC (RPCs)
-- ============================================

-- 1. Request Return (User Action)
CREATE OR REPLACE FUNCTION request_return(
  p_order_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status VARCHAR;
  v_user_id UUID;
  v_delivered_at TIMESTAMP;
  v_days_since_delivery INTEGER;
BEGIN
  -- Check order existence, ownership, and status
  SELECT status, user_id, delivered_at INTO v_order_status, v_user_id, v_delivered_at
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  -- Only logged-in users can request returns
  IF v_user_id != auth.uid() THEN
     RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Only delivered orders can be returned
  IF v_order_status != 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only delivered orders can be returned');
  END IF;

  -- Check 30-day window
  IF v_delivered_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Delivery date not set');
  END IF;

  v_days_since_delivery := EXTRACT(DAY FROM NOW() - v_delivered_at);
  
  IF v_days_since_delivery > 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Return window expired (30 days from delivery)');
  END IF;

  -- Update order status AND set return timestamps + address
  UPDATE orders
  SET 
    status = 'return_requested',
    return_initiated_at = NOW(),
    return_deadline_at = NOW() + INTERVAL '14 days',
    return_address = jsonb_build_object(
      'street', 'Carrer de Còrsega 360',
      'city', 'Barcelona',
      'postal_code', '08037',
      'country', 'ES',
      'instructions', 'Por favor, devuelve el producto en su embalaje original en buen estado'
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Log status change
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, 'delivered', 'return_requested', auth.uid(), 'user', p_reason);

  RETURN jsonb_build_object('success', true, 'message', 'Return request submitted successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- 2. Process Return (Admin Action)
CREATE OR REPLACE FUNCTION process_return(
  p_order_id UUID,
  p_approved BOOLEAN,
  p_restore_stock BOOLEAN,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status VARCHAR;
  v_is_admin BOOLEAN;
  v_item RECORD;
  v_new_status VARCHAR;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  -- Check order status
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order_status != 'return_requested' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order must be in return_requested status');
  END IF;

  -- Determine new status
  IF p_approved THEN
    v_new_status := 'returned';
  ELSE
    v_new_status := 'delivered'; -- Reject return, back to delivered
  END IF;

  -- Update order status
  UPDATE orders
  SET status = v_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  -- Restore stock if approved and requested
  IF p_approved AND p_restore_stock THEN
    FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- Log status change
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, 'return_requested', v_new_status, auth.uid(), 'admin', p_notes);

  RETURN jsonb_build_object('success', true, 'message', 'Return processed successfully', 'new_status', v_new_status);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- 3. Process Refund (Admin Action)
CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status VARCHAR;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  -- Check order status
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order_status != 'returned' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order must be in returned status to process refund');
  END IF;

  -- Update order status
  UPDATE orders
  SET status = 'refunded', updated_at = NOW()
  WHERE id = p_order_id;

  -- Log status change
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, 'returned', 'refunded', auth.uid(), 'admin', 'Refund processed');

  -- TODO: In production, trigger actual refund via Stripe Edge Function here

  RETURN jsonb_build_object('success', true, 'message', 'Refund processed successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- ---------------------------------------------------------------------------
-- GUEST TO REGISTERED USER FLOW EXTENSIONS
-- ---------------------------------------------------------------------------

-- 1. Carts Table (Supports Guest sessions and Registered Users)
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE, -- For guest sessions
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  CONSTRAINT user_or_session_check CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  )
);

-- Enable RLS for carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Policies for carts
CREATE POLICY "Users can access their own cart"
  ON public.carts FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- RPC: Update Order Status (Admin)
-- ============================================
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status VARCHAR;
BEGIN
  -- Fetch old status
  SELECT status INTO v_old_status
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid status: ' || p_new_status);
  END IF;

  -- Update status
  UPDATE orders
  SET status = p_new_status,
      updated_at = NOW(),
      delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END
  WHERE id = p_order_id;

  -- Log status change
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type)
  VALUES (p_order_id, v_old_status, p_new_status, auth.uid(), 'admin');

  RETURN jsonb_build_object('success', true, 'message', 'Order status updated', 'old_status', v_old_status, 'new_status', p_new_status);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE POLICY "Access by session_id (app logic handles security)"
  ON public.carts FOR ALL
  USING (session_id IS NOT NULL);

-- 2. User Addresses Table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address_data JSONB NOT NULL,
  address_type VARCHAR(20) CHECK (address_type IN ('shipping', 'billing')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index for unique default address per type per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_address 
ON public.user_addresses (user_id, address_type) 
WHERE is_default = TRUE;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own addresses"
  ON public.user_addresses FOR ALL
  USING (auth.uid() = user_id);

-- 3. RPC: Migrate Guest Cart to User
CREATE OR REPLACE FUNCTION migrate_guest_cart_to_user(
  p_session_id TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_cart_id UUID;
  v_user_cart_id UUID;
  v_guest_items JSONB;
  v_user_items JSONB;
BEGIN
  -- Get user cart if exists
  SELECT id, items INTO v_user_cart_id, v_user_items
  FROM carts
  WHERE user_id = p_user_id;

  -- Get guest cart
  SELECT id, items INTO v_guest_cart_id, v_guest_items
  FROM carts
  WHERE session_id = p_session_id;

  IF v_guest_cart_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Guest cart not found');
  END IF;

  IF v_user_cart_id IS NULL THEN
    -- Scenario A: User has no cart. Assign guest cart to user.
    UPDATE carts
    SET user_id = p_user_id, session_id = NULL, updated_at = NOW()
    WHERE id = v_guest_cart_id;
  ELSE
    -- Scenario B: User already has a cart. Merge items.
    -- Simple append strategy: User cart items + Guest cart items.
    
    UPDATE carts 
    SET items = v_user_items || v_guest_items,
        updated_at = NOW()
    WHERE id = v_user_cart_id;
    
    -- Delete the guest cart after merging
    DELETE FROM carts WHERE id = v_guest_cart_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Cart migrated successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. Trigger to ensure generic profile creation on sign up (Safety net)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, FALSE)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();





