-- ============================================
-- FIX: Admin RPCs y RLS sin service role key
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. RPC: admin_update_order_status
--    Usada por updatestatus.ts para cambiar estado de pedidos.
--    SECURITY DEFINER → puede actualizar cualquier pedido
--    Verifica is_admin internamente para doble seguridad.
-- ============================================
CREATE OR REPLACE FUNCTION admin_update_order_status(
  p_order_id UUID,
  p_new_status TEXT
) RETURNS jsonb AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_valid_statuses TEXT[] := ARRAY[
    'awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled',
    'return_requested', 'returned', 'partially_returned', 'refunded', 'partially_refunded'
  ];
BEGIN
  -- Verificar que el caller es admin
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Admin access required');
  END IF;

  -- Validar status
  IF NOT (p_new_status = ANY(v_valid_statuses)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status: ' || p_new_status);
  END IF;

  -- Actualizar pedido (bypasses RLS gracias a SECURITY DEFINER)
  UPDATE public.orders
  SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================
-- 2. RPC: delete_my_account
--    Usada por delete-account.ts para eliminar cuenta del usuario autenticado.
--    SECURITY DEFINER → puede borrar de auth.users
--    Solo elimina el propio usuario (auth.uid()).
-- ============================================
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Eliminar direcciones guardadas
  DELETE FROM public.user_addresses WHERE user_id = v_user_id;

  -- 2. Eliminar wishlist
  DELETE FROM public.wishlist WHERE user_id = v_user_id;

  -- 3. Anonimizar pedidos (user_id → NULL, se conserva el historial para contabilidad)
  UPDATE public.orders
  SET user_id = NULL
  WHERE user_id = v_user_id;

  -- 4. Eliminar perfil
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 5. Eliminar de auth.users (requiere SECURITY DEFINER con permisos de postgres)
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================
-- 3. RLS para products (writes solo admin)
-- ============================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "products_write_admin" ON public.products;
CREATE POLICY "products_write_admin"
  ON public.products FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 4. RLS para app_settings (writes solo admin, reads solo admin)
-- ============================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_admin" ON public.app_settings;
CREATE POLICY "app_settings_select_admin"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "app_settings_write_admin" ON public.app_settings;
CREATE POLICY "app_settings_write_admin"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 5. RLS para brands (SELECT público, writes solo admin)
-- ============================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_select_all" ON public.brands;
CREATE POLICY "brands_select_all"
  ON public.brands FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "brands_write_admin" ON public.brands;
CREATE POLICY "brands_write_admin"
  ON public.brands FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 6. RLS para orders (UPDATE admin)
-- ============================================
-- SELECT: cada usuario ve sus pedidos (ya existente normalmente)
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin puede actualizar cualquier pedido (además del RPC)
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 7. Verificar RPCs creados
-- ============================================
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('admin_update_order_status', 'delete_my_account');
-- prosecdef = true significa SECURITY DEFINER ✓
