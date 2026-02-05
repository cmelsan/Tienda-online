-- ============================================================
-- SCRIPT PARA ARREGLAR PERMISOS RLS EN SUPABASE
-- ============================================================

-- 1. DESHABILITAR RLS EN app_settings (permitir acceso a admins)
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- 2. DESHABILITAR RLS EN products (para lectura pública, pero control en escritura)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Crear políticas específicas si es necesario:

-- Para app_settings: Solo admins pueden escribir
CREATE POLICY "Allow public read app_settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write app_settings" ON public.app_settings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY "Allow admin insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- Para products: Público puede leer, solo admin puede escribir flash sales
CREATE POLICY "Allow public read products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Allow admin update products" ON public.products
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- 3. VERIFICAR ESTADO
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('app_settings', 'products')
ORDER BY tablename;

-- 4. LISTAR POLÍTICAS EXISTENTES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('app_settings', 'products')
ORDER BY tablename, policyname;
