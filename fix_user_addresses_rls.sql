-- ============================================
-- RLS POLICIES FOR user_addresses
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Activar RLS en la tabla
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes (por si hay alguna rota)
DROP POLICY IF EXISTS "user_addresses_select" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_insert" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_update" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_delete" ON public.user_addresses;

-- 3. Crear políticas correctas
CREATE POLICY "user_addresses_select"
  ON public.user_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_addresses_insert"
  ON public.user_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_addresses_update"
  ON public.user_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_addresses_delete"
  ON public.user_addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Verificar que se crearon correctamente
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_addresses'
ORDER BY cmd;
