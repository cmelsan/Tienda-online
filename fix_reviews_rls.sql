-- ============================================
-- RLS POLICIES FOR reviews, orders, order_items
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;

-- Cualquiera puede leer reseñas (pública)
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo usuarios autenticados pueden insertar sus propias reseñas
CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Solo pueden editar sus propias reseñas
CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Solo pueden borrar sus propias reseñas
CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2. ORDERS — usuarios ven sus propios pedidos
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;

CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- 3. ORDER_ITEMS — usuarios ven los items de sus pedidos
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;

CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );


-- 4. Verificar
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('reviews', 'orders', 'order_items')
ORDER BY tablename, cmd;
