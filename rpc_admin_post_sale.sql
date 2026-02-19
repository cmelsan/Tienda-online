-- ============================================================
-- FUNCIONES RPC PARA GESTIÓN DE VENTAS POSTERIORES DE ADMIN
-- EJECUTAR EN EL EDITOR SQL DE SUPABASE
-- ============================================================

-- ============================================================
-- RPC #1: CANCELAR PEDIDO (ATÓMICO)
-- Condiciones: estado = 'pagado' SOLO
-- Acciones:
--   1. Actualizar orders.status -> 'cancelado'
--   2. Restaurar products.stock += order_items.quantity
--   3. Insertar registro en order_status_history
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
    v_result JSON;
BEGIN
    -- Validar: El pedido existe y el estado es 'pagado'
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    IF v_order.status != 'paid' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solo se pueden cancelar pedidos con estado pagado',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    -- START TRANSACTION (implicit in plpgsql)
    BEGIN
        -- 1. Actualizar estado del pedido a 'cancelado'
        UPDATE orders
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = p_order_id;

        -- 2. Restaurar inventario para cada producto pedido
        FOR v_order_item IN 
            SELECT oi.product_id, oi.quantity 
            FROM order_items oi 
            WHERE oi.order_id = p_order_id
        LOOP
            UPDATE products
            SET stock = stock + v_order_item.quantity
            WHERE id = v_order_item.product_id;
        END LOOP;

        -- 3. Insertar registro de historial
        INSERT INTO order_status_history (
            order_id,
            from_status,
            to_status,
            changed_by,
            changed_by_type,
            notes,
            created_at
        ) VALUES (
            p_order_id,
            v_order.status,
            'cancelled',
            p_admin_id,
            'admin',
            p_notes,
            NOW()
        );

        -- Return success
        RETURN json_build_object(
            'success', true,
            'message', 'Pedido cancelado e inventario restaurado',
            'order_id', p_order_id,
            'new_status', 'cancelled',
            'code', 'CANCEL_SUCCESS'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Retroceso automático en caso de error en plpgsql
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'TRANSACTION_ERROR'
        );
    END;
END;
$$;

-- ============================================================
-- RPC #2: MARCAR COMO ENVIADO
-- Condiciones: estado = 'pagado'
-- Acciones:
--   1. Actualizar orders.status -> 'enviado'
--   2. Insertar registro en order_status_history
-- ============================================================
CREATE OR REPLACE FUNCTION admin_mark_shipped(
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
BEGIN
    -- Validar
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    IF v_order.status != 'paid' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solo se pueden marcar como enviados los pedidos pagados',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    BEGIN
        -- Actualizar estado
        UPDATE orders
        SET status = 'shipped', updated_at = NOW()
        WHERE id = p_order_id;

        -- Insertar historial
        INSERT INTO order_status_history (
            order_id,
            from_status,
            to_status,
            changed_by,
            changed_by_type,
            notes,
            created_at
        ) VALUES (
            p_order_id,
            v_order.status,
            'shipped',
            p_admin_id,
            'admin',
            p_notes,
            NOW()
        );

        RETURN json_build_object(
            'success', true,
            'message', 'Marcado como enviado',
            'order_id', p_order_id,
            'new_status', 'shipped',
            'code', 'SHIPPED_SUCCESS'
        );

    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'TRANSACTION_ERROR'
        );
    END;
END;
$$;

-- ============================================================
-- RPC #3: MARCAR COMO ENTREGADO
-- Condiciones: estado = 'enviado'
-- Acciones:
--   1. Actualizar orders.status -> 'entregado'
--   2. Establecer orders.delivered_at = NOW()
--   3. Establecer orders.return_deadline = NOW() + 14 días
--   4. Insertar registro en order_status_history
-- ============================================================
CREATE OR REPLACE FUNCTION admin_mark_delivered(
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
BEGIN
    -- Validate
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    IF v_order.status != 'shipped' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solo se pueden marcar como entregados los pedidos enviados',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    BEGIN
        -- Actualizar estado y marcas de tiempo
        UPDATE orders
        SET 
            status = 'delivered',
            delivered_at = NOW(),
            return_deadline = NOW() + INTERVAL '14 days',
            updated_at = NOW()
        WHERE id = p_order_id;

        -- Insertar historial
        INSERT INTO order_status_history (
            order_id,
            from_status,
            to_status,
            changed_by,
            changed_by_type,
            notes,
            created_at
        ) VALUES (
            p_order_id,
            v_order.status,
            'delivered',
            p_admin_id,
            'admin',
            p_notes,
            NOW()
        );

        RETURN json_build_object(
            'success', true,
            'message', 'Marcado como entregado',
            'order_id', p_order_id,
            'new_status', 'delivered',
            'delivered_at', NOW(),
            'return_deadline', NOW() + INTERVAL '14 days',
            'code', 'DELIVERED_SUCCESS'
        );

    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'TRANSACTION_ERROR'
        );
    END;
END;
$$;

-- ============================================================
-- RPC #4: PROCESAR DEVOLUCI\u00d3N / REEMBOLSO
-- Condiciones: estado = 'solicitud_devoluci\u00f3n' o 'devuelto'
-- Acciones:
--   1. Actualizar orders.status -> 'devuelto' o 'reembolsado'
--   2. Insertar registro en order_status_history
--   3. Opcionalmente restaurar inventario (para solicitud_devoluci\u00f3n -> devuelto)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_process_return(
    p_order_id UUID,
    p_admin_id UUID,
    p_new_status TEXT, -- 'returned' or 'refunded'
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
    v_allowed_from_status TEXT[] := ARRAY['return_requested', 'returned'];
    v_allowed_to_status TEXT[] := ARRAY['returned', 'refunded', 'partially_refunded'];
BEGIN
    -- Validar
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    -- Validar estado actual
    IF NOT v_order.status = ANY(v_allowed_from_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El pedido debe estar en estado solicitud_devolución o devuelto',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    -- Validar nuevo estado
    IF NOT p_new_status = ANY(v_allowed_to_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Estado nuevo inválido. Debe ser devuelto, reembolsado o reembolsado parcialmente',
            'provided_status', p_new_status,
            'code', 'INVALID_NEW_STATUS'
        );
    END IF;

    BEGIN
        -- Actualizar estado
        UPDATE orders
        SET status = p_new_status, updated_at = NOW()
        WHERE id = p_order_id;

        -- Restaurar inventario opcionalmente
        IF p_restore_stock THEN
            FOR v_order_item IN 
                SELECT oi.product_id, oi.quantity 
                FROM order_items oi 
                WHERE oi.order_id = p_order_id
            LOOP
                UPDATE products
                SET stock = stock + v_order_item.quantity
                WHERE id = v_order_item.product_id;
            END LOOP;
        END IF;

        -- Insertar historial
        INSERT INTO order_status_history (
            order_id,
            from_status,
            to_status,
            changed_by,
            changed_by_type,
            notes,
            created_at
        ) VALUES (
            p_order_id,
            v_order.status,
            p_new_status,
            p_admin_id,
            'admin',
            CASE 
                WHEN p_restore_stock THEN 'Inventario restaurado. ' || COALESCE(p_notes, '')
                ELSE p_notes
            END,
            NOW()
        );

        RETURN json_build_object(
            'success', true,
            'message', 'Devolución procesada exitosamente',
            'order_id', p_order_id,
            'new_status', p_new_status,
            'stock_restored', p_restore_stock,
            'code', 'RETURN_PROCESSED_SUCCESS'
        );

    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'TRANSACTION_ERROR'
        );
    END;
END;
$$;

-- ============================================================
-- RPC #5: OBTENER ACCIONES DISPONIBLES (Ayudante)
-- Retorna acciones disponibles para el estado actual del pedido
-- Útel para la UI para determinar qué botones mostrar
-- ============================================================
CREATE OR REPLACE FUNCTION get_order_available_actions(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_actions TEXT[];
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Pedido no encontrado');
    END IF;

    -- Determinar acciones disponibles según el estado
    v_actions := ARRAY[]::TEXT[];
    
    CASE v_order.status
        WHEN 'awaiting_payment' THEN
            v_actions := ARRAY['mark_paid', 'view_details'];
        WHEN 'paid' THEN
            v_actions := ARRAY['mark_shipped', 'cancel_order', 'view_details'];
        WHEN 'shipped' THEN
            v_actions := ARRAY['mark_delivered', 'view_details'];
        WHEN 'delivered' THEN
            v_actions := ARRAY['view_details', 'view_returns'];
        WHEN 'return_requested' THEN
            v_actions := ARRAY['process_return', 'view_details'];
        WHEN 'returned' THEN
            v_actions := ARRAY['refund', 'view_details'];
        WHEN 'cancelled' THEN
            v_actions := ARRAY['view_details'];
        WHEN 'refunded' THEN
            v_actions := ARRAY['view_details'];
    END CASE;

    RETURN json_build_object(
        'success', true,
        'order_id', p_order_id,
        'current_status', v_order.status,
        'available_actions', v_actions
    );
END;
$$;

-- ============================================================
-- PERMISOS
-- ============================================================
GRANT EXECUTE ON FUNCTION admin_cancel_order_atomic(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_shipped(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_delivered(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_process_return(UUID, UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_available_actions(UUID) TO authenticated;

-- ============================================================
-- NOTAS:
-- 1. Todas las funciones usan SECURITY DEFINER para eludir RLS
-- 2. Recuerda agregar verificación de autenticación en tu capa de API
-- 3. La restauración de inventario es automática en cancel_order_atomic
-- 4. return_deadline se calcula al momento de la entrega
-- 5. Todas las marcas de tiempo están en UTC (NOW())
-- ============================================================
