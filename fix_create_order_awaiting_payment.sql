-- ============================================
-- FIX: create_order debe crear con 'awaiting_payment' y NO descontar stock
-- El stock se descuenta en el webhook de Stripe al confirmar el pago.
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- Este archivo contiene 3 funciones a actualizar:
-- 1. create_order         → crea con 'awaiting_payment', sin descontar stock
-- 2. cancel_order         → permite cancelar también desde 'awaiting_payment' (sin restaurar stock)
-- 3. admin_cancel_order_atomic → ídem para el admin
-- ============================================

CREATE OR REPLACE FUNCTION create_order(
  p_items JSONB,
  p_total_amount INTEGER,
  p_shipping_address JSONB,
  p_guest_email VARCHAR DEFAULT NULL,
  p_customer_name VARCHAR DEFAULT NULL,
  p_coupon_id UUID DEFAULT NULL,
  p_discount_amount INTEGER DEFAULT 0
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

  -- 2. Validate Stock for ALL items (but do NOT deduct yet — deducted by Stripe webhook after payment)
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

  -- 3. Generate Order Number
  v_order_number := generate_order_number();

  -- 4. Create Order with 'awaiting_payment' (stock is deducted AFTER payment is confirmed)
  INSERT INTO orders (order_number, user_id, guest_email, customer_name, status, total_amount, shipping_address)
  VALUES (v_order_number, v_user_id, p_guest_email, v_customer_name, 'awaiting_payment', p_total_amount, p_shipping_address)
  RETURNING id INTO v_order_id;

  -- 5. Create Order Items (NO stock deduction here)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_item_price := (v_item->>'price')::INTEGER;

    INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_product_id, v_quantity, v_item_price);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- ============================================================
-- 2. cancel_order actualizado
-- Permite cancelar desde 'paid' (restaura stock) o desde
-- 'awaiting_payment' (no restaura stock, nunca se descontó).
-- ============================================================
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
  SELECT status, user_id INTO v_order_status, v_user_id
  FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  IF v_order_status NOT IN ('paid', 'awaiting_payment') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order cannot be cancelled. It may already be shipped or cancelled.');
  END IF;

  UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = p_order_id;

  -- Solo restaurar stock si el pedido estaba 'paid' (el stock se descuenta en el webhook)
  IF v_order_status = 'paid' THEN
    FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id LOOP
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- Liberar cupón si existía
  IF EXISTS (SELECT 1 FROM coupon_usage WHERE order_id = p_order_id) THEN
    UPDATE coupons
    SET current_uses = GREATEST(0, current_uses - 1)
    WHERE id IN (SELECT coupon_id FROM coupon_usage WHERE order_id = p_order_id);
    DELETE FROM coupon_usage WHERE order_id = p_order_id;
  END IF;

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, v_order_status, 'cancelled', auth.uid(), 'user', 'Self-cancelled by customer');

  RETURN jsonb_build_object('success', true, 'message', 'Order cancelled successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- ============================================================
-- 3. admin_cancel_order_atomic actualizado
-- Igual: permite cancelar 'paid' (restaura stock) o
-- 'awaiting_payment' (sin restaurar stock).
-- ============================================================
CREATE OR REPLACE FUNCTION admin_cancel_order_atomic(
    p_order_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_order_item RECORD;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Pedido no encontrado', 'code', 'ORDER_NOT_FOUND');
    END IF;

    IF v_order.status NOT IN ('paid', 'awaiting_payment') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solo se pueden cancelar pedidos pagados o pendientes de pago',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    BEGIN
        UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = p_order_id;

        -- Solo restaurar stock si estaba 'paid'
        IF v_order.status = 'paid' THEN
            FOR v_order_item IN
                SELECT oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = p_order_id
            LOOP
                UPDATE products SET stock = stock + v_order_item.quantity WHERE id = v_order_item.product_id;
            END LOOP;
        END IF;

        INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes, created_at)
        VALUES (p_order_id, v_order.status, 'cancelled', p_admin_id, 'admin', p_notes, NOW());

        RETURN json_build_object('success', true, 'message', 'Pedido cancelado correctamente');

    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM, 'code', 'TRANSACTION_FAILED');
    END;
END;
$$;
