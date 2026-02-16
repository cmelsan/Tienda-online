-- ============================================================
-- MIGRACIÓN: Devoluciones por producto individual
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir campos de devolución a order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT NULL
  CHECK (return_status IS NULL OR return_status IN ('requested', 'approved', 'rejected', 'refunded')),
ADD COLUMN IF NOT EXISTS return_reason TEXT,
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_processed_at TIMESTAMP WITH TIME ZONE;

-- 2. Añadir nuevo estado 'partially_returned' al pedido
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check CHECK (
  status::text = ANY (ARRAY[
    'awaiting_payment', 'paid', 'shipped', 'delivered',
    'cancelled', 'return_requested', 'returned', 'refunded',
    'partially_returned'
  ]::text[])
);

-- 3. Nueva función: Solicitar devolución por productos
CREATE OR REPLACE FUNCTION request_return(
  p_order_id UUID,
  p_reason TEXT,
  p_item_ids UUID[] DEFAULT NULL
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
  v_item_id UUID;
  v_item_count INTEGER := 0;
  v_total_items INTEGER;
  v_items_to_return UUID[];
BEGIN
  -- Verificar pedido
  SELECT status, user_id, delivered_at INTO v_order_status, v_user_id, v_delivered_at
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pedido no encontrado');
  END IF;

  -- Solo el dueño puede solicitar devolución
  IF v_user_id != auth.uid() THEN
     RETURN jsonb_build_object('success', false, 'message', 'No autorizado');
  END IF;

  -- Solo pedidos entregados o parcialmente devueltos pueden solicitar devolución
  IF v_order_status NOT IN ('delivered', 'partially_returned') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solo pedidos entregados pueden solicitar devolución');
  END IF;

  -- Verificar ventana de 30 días
  IF v_delivered_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Fecha de entrega no encontrada');
  END IF;

  v_days_since_delivery := EXTRACT(DAY FROM NOW() - v_delivered_at);
  
  IF v_days_since_delivery > 30 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Plazo de devolución expirado (30 días desde la entrega)');
  END IF;

  -- Determinar qué items devolver
  IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
    -- Si no se especifican items, devolver todos los que no tienen devolución
    SELECT array_agg(id) INTO v_items_to_return
    FROM order_items
    WHERE order_id = p_order_id
      AND (return_status IS NULL OR return_status = 'rejected');
  ELSE
    v_items_to_return := p_item_ids;
  END IF;

  IF v_items_to_return IS NULL OR array_length(v_items_to_return, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No hay productos disponibles para devolver');
  END IF;

  -- Validar que los items pertenecen al pedido y no están ya en devolución
  FOR v_item_id IN SELECT unnest(v_items_to_return) LOOP
    PERFORM 1 FROM order_items
    WHERE id = v_item_id
      AND order_id = p_order_id
      AND (return_status IS NULL OR return_status = 'rejected');
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 
        'Producto no válido para devolución o ya en proceso');
    END IF;
    
    v_item_count := v_item_count + 1;
  END LOOP;

  -- Marcar los items como solicitados para devolución
  UPDATE order_items
  SET 
    return_status = 'requested',
    return_reason = p_reason,
    return_requested_at = NOW()
  WHERE id = ANY(v_items_to_return)
    AND order_id = p_order_id;

  -- Contar total de items del pedido
  SELECT COUNT(*) INTO v_total_items FROM order_items WHERE order_id = p_order_id;

  -- Actualizar estado del pedido
  UPDATE orders
  SET 
    status = 'return_requested',
    return_initiated_at = NOW(),
    return_deadline_at = NOW() + INTERVAL '14 days',
    return_reason = p_reason,
    return_address = jsonb_build_object(
      'street', 'Carrer de Còrsega 360',
      'city', 'Barcelona',
      'postal_code', '08037',
      'country', 'ES',
      'instructions', 'Por favor, devuelve los productos en su embalaje original en buen estado'
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Log de historial
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, v_order_status, 'return_requested', auth.uid(), 'user', 
    'Devolución de ' || v_item_count || ' de ' || v_total_items || ' producto(s). Motivo: ' || p_reason);

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Solicitud de devolución enviada correctamente',
    'items_requested', v_item_count,
    'total_items', v_total_items
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. Nueva función: Admin procesa devolución (compatible con items individuales)
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
  v_total_items INTEGER;
  v_returned_items INTEGER;
  v_refund_amount INTEGER := 0;
BEGIN
  -- Verificar admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acceso de administrador requerido');
  END IF;

  -- Verificar estado del pedido
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pedido no encontrado');
  END IF;

  IF v_order_status != 'return_requested' THEN
    RETURN jsonb_build_object('success', false, 'message', 'El pedido debe estar en estado return_requested');
  END IF;

  IF p_approved THEN
    -- Aprobar: marcar items con return_status='requested' como 'approved'
    UPDATE order_items
    SET return_status = 'approved', return_processed_at = NOW()
    WHERE order_id = p_order_id AND return_status = 'requested';

    -- Restaurar stock si se solicita (solo de los items aprobados)
    IF p_restore_stock THEN
      FOR v_item IN 
        SELECT product_id, quantity FROM order_items 
        WHERE order_id = p_order_id AND return_status = 'approved'
      LOOP
        UPDATE products
        SET stock = stock + v_item.quantity
        WHERE id = v_item.product_id;
      END LOOP;
    END IF;

    -- Calcular monto del reembolso (solo items devueltos)
    SELECT COALESCE(SUM(price_at_purchase * quantity), 0) INTO v_refund_amount
    FROM order_items WHERE order_id = p_order_id AND return_status = 'approved';

    -- Contar items totales vs devueltos
    SELECT COUNT(*) INTO v_total_items FROM order_items WHERE order_id = p_order_id;
    SELECT COUNT(*) INTO v_returned_items FROM order_items 
    WHERE order_id = p_order_id AND return_status IN ('approved', 'refunded');

    -- Determinar nuevo estado del pedido
    IF v_returned_items >= v_total_items THEN
      v_new_status := 'returned';
    ELSE
      v_new_status := 'partially_returned';
    END IF;

  ELSE
    -- Rechazar: marcar items con return_status='requested' como 'rejected'
    UPDATE order_items
    SET return_status = 'rejected', return_processed_at = NOW()
    WHERE order_id = p_order_id AND return_status = 'requested';

    -- Verificar si quedan otros items aprobados
    SELECT COUNT(*) INTO v_returned_items FROM order_items 
    WHERE order_id = p_order_id AND return_status IN ('approved', 'refunded');

    IF v_returned_items > 0 THEN
      v_new_status := 'partially_returned';
    ELSE
      v_new_status := 'delivered';
    END IF;
  END IF;

  -- Actualizar estado del pedido
  UPDATE orders
  SET status = v_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  -- Log
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, 'return_requested', v_new_status, auth.uid(), 'admin', p_notes);

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Devolución procesada correctamente', 
    'new_status', v_new_status,
    'refund_amount', v_refund_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 5. Actualizar admin_process_return para items individuales
CREATE OR REPLACE FUNCTION admin_process_return(
    p_order_id UUID,
    p_admin_id UUID,
    p_new_status TEXT,
    p_restore_stock BOOLEAN DEFAULT false,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_order_item RECORD;
    v_total_items INTEGER;
    v_returned_items INTEGER;
    v_refund_amount INTEGER := 0;
    v_final_status TEXT;
    v_allowed_from_status TEXT[] := ARRAY['return_requested', 'returned', 'partially_returned'];
    v_allowed_to_status TEXT[] := ARRAY['returned', 'refunded', 'partially_returned'];
BEGIN
    -- Validar pedido
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Pedido no encontrado', 'code', 'ORDER_NOT_FOUND');
    END IF;

    IF NOT v_order.status = ANY(v_allowed_from_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El pedido debe estar en estado return_requested, returned o partially_returned',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    IF NOT p_new_status = ANY(v_allowed_to_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Estado nuevo inválido',
            'provided_status', p_new_status,
            'code', 'INVALID_NEW_STATUS'
        );
    END IF;

    BEGIN
        IF p_new_status = 'refunded' THEN
            -- Marcar items aprobados como reembolsados
            UPDATE order_items
            SET return_status = 'refunded', return_processed_at = NOW()
            WHERE order_id = p_order_id AND return_status = 'approved';

            -- Calcular monto reembolso
            SELECT COALESCE(SUM(price_at_purchase * quantity), 0) INTO v_refund_amount
            FROM order_items WHERE order_id = p_order_id AND return_status = 'refunded';

            -- Verificar si todos los items están devueltos/reembolsados
            SELECT COUNT(*) INTO v_total_items FROM order_items WHERE order_id = p_order_id;
            SELECT COUNT(*) INTO v_returned_items FROM order_items 
            WHERE order_id = p_order_id AND return_status = 'refunded';

            IF v_returned_items >= v_total_items THEN
                v_final_status := 'refunded';
            ELSE
                v_final_status := 'partially_returned';
            END IF;
        ELSE
            -- Para 'returned' - aprobar items solicitados
            UPDATE order_items
            SET return_status = 'approved', return_processed_at = NOW()
            WHERE order_id = p_order_id AND return_status = 'requested';

            IF p_restore_stock THEN
                FOR v_order_item IN 
                    SELECT oi.product_id, oi.quantity 
                    FROM order_items oi 
                    WHERE oi.order_id = p_order_id AND oi.return_status = 'approved'
                LOOP
                    UPDATE products
                    SET stock = stock + v_order_item.quantity
                    WHERE id = v_order_item.product_id;
                END LOOP;
            END IF;

            SELECT COUNT(*) INTO v_total_items FROM order_items WHERE order_id = p_order_id;
            SELECT COUNT(*) INTO v_returned_items FROM order_items 
            WHERE order_id = p_order_id AND return_status IN ('approved', 'refunded');

            IF v_returned_items >= v_total_items THEN
                v_final_status := 'returned';
            ELSE
                v_final_status := 'partially_returned';
            END IF;
        END IF;

        -- Actualizar estado
        UPDATE orders
        SET status = v_final_status, updated_at = NOW()
        WHERE id = p_order_id;

        -- Log
        INSERT INTO order_status_history (
            order_id, from_status, to_status, changed_by, changed_by_type, notes, created_at
        ) VALUES (
            p_order_id, v_order.status, v_final_status, p_admin_id, 'admin',
            CASE WHEN p_restore_stock THEN 'Stock restaurado. ' || COALESCE(p_notes, '') ELSE p_notes END,
            NOW()
        );

        RETURN json_build_object(
            'success', true,
            'message', 'Devolución procesada correctamente',
            'order_id', p_order_id,
            'new_status', v_final_status,
            'stock_restored', p_restore_stock,
            'refund_amount', v_refund_amount,
            'code', 'RETURN_PROCESSED_SUCCESS'
        );

    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM, 'code', 'TRANSACTION_ERROR');
    END;
END;
$$;

-- 6. Actualizar process_refund para reembolsos parciales
CREATE OR REPLACE FUNCTION process_refund(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status VARCHAR;
  v_is_admin BOOLEAN;
  v_refund_amount INTEGER := 0;
  v_total_items INTEGER;
  v_refunded_items INTEGER;
  v_final_status VARCHAR;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acceso de administrador requerido');
  END IF;

  SELECT status INTO v_order_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pedido no encontrado');
  END IF;

  IF v_order_status NOT IN ('returned', 'partially_returned') THEN
    RETURN jsonb_build_object('success', false, 'message', 'El pedido debe estar devuelto para procesar reembolso');
  END IF;

  -- Marcar items aprobados como reembolsados
  UPDATE order_items
  SET return_status = 'refunded', return_processed_at = NOW()
  WHERE order_id = p_order_id AND return_status = 'approved';

  -- Calcular monto de reembolso
  SELECT COALESCE(SUM(price_at_purchase * quantity), 0) INTO v_refund_amount
  FROM order_items WHERE order_id = p_order_id AND return_status = 'refunded';

  -- Verificar si todo fue reembolsado
  SELECT COUNT(*) INTO v_total_items FROM order_items WHERE order_id = p_order_id;
  SELECT COUNT(*) INTO v_refunded_items FROM order_items 
  WHERE order_id = p_order_id AND return_status = 'refunded';

  IF v_refunded_items >= v_total_items THEN
    v_final_status := 'refunded';
  ELSE
    v_final_status := 'partially_returned';
  END IF;

  UPDATE orders SET status = v_final_status, updated_at = NOW() WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_by_type, notes)
  VALUES (p_order_id, v_order_status, v_final_status, auth.uid(), 'admin', 
    'Reembolso parcial: €' || (v_refund_amount / 100.0)::TEXT);

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Reembolso procesado', 
    'new_status', v_final_status,
    'refund_amount', v_refund_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
