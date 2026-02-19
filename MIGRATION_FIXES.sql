-- ============================================================
-- MIGRATION_FIXES.sql
-- Ejecutar en Supabase SQL Editor (en este orden exacto)
-- ============================================================


-- ============================================================
-- 1. Añadir stripe_payment_intent_id a orders
--    (necesario para que los reembolsos funcionen)
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id character varying;


-- ============================================================
-- 2. Crear tabla refunds_log (referenciada en process-refund.ts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.refunds_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  stripe_refund_id character varying,
  amount integer NOT NULL,
  admin_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT refunds_log_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);


-- ============================================================
-- 3. Función delete_pending_order (SECURITY DEFINER)
--    Permite al endpoint delete-pending.ts usar anon key
--    sin necesitar SUPABASE_SERVICE_ROLE_KEY en producción
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_pending_order(p_order_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Verificar que el pedido existe y está en awaiting_payment
  SELECT status INTO v_status
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    -- No existe, pero no es error (puede que ya se borró)
    RETURN jsonb_build_object('success', true, 'message', 'Order not found or already deleted');
  END IF;

  IF v_status != 'awaiting_payment' THEN
    -- El pedido ya fue pagado u otro estado — no borrar
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order is not in awaiting_payment status',
      'current_status', v_status
    );
  END IF;

  -- Borrar items primero (FK constraint)
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- Borrar el pedido (doble check de seguridad en el WHERE)
  DELETE FROM orders
  WHERE id = p_order_id AND status = 'awaiting_payment';

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id
  );
END;
$$;

-- Permisos: anon puede llamarlo (la función internamente válida el estado)
GRANT EXECUTE ON FUNCTION public.delete_pending_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pending_order(UUID) TO anon;


-- ============================================================
-- 4. Función decrease_product_stock_atomic (si no existe)
--    Necesaria para que el webhook descuente stock tras el pago
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrease_product_stock_atomic(
  p_product_id UUID,
  p_quantity INT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_new_stock INT;
BEGIN
  SELECT id, stock, name
  INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
  END IF;

  IF v_product.stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock',
      'product_name', v_product.name,
      'available', v_product.stock,
      'requested', p_quantity
    );
  END IF;

  v_new_stock := v_product.stock - p_quantity;
  UPDATE products
  SET stock = v_new_stock, updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'product_name', v_product.name,
    'new_stock', v_new_stock,
    'quantity_deducted', p_quantity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrease_product_stock_atomic(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrease_product_stock_atomic(UUID, INT) TO anon;
