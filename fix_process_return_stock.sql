-- ============================================================
-- FIX: admin_process_return restaura stock de TODOS los items
-- cuando debería restaurar solo los items solicitados para devolución
-- Ejecutar en Supabase SQL Editor
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
    v_allowed_from_status TEXT[] := ARRAY['return_requested', 'returned', 'partially_returned'];
    v_allowed_to_status TEXT[] := ARRAY['returned', 'refunded', 'partially_refunded', 'delivered'];
    v_refund_amount BIGINT := 0;
BEGIN
    -- Validar pedido
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
            'error', 'El pedido debe estar en estado solicitud_devolución, devuelto o devuelto parcialmente',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    -- Validar nuevo estado
    IF NOT p_new_status = ANY(v_allowed_to_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Estado nuevo inválido. Debe ser devuelto, reembolsado, reembolsado parcialmente o entregado (rechazo)',
            'provided_status', p_new_status,
            'code', 'INVALID_NEW_STATUS'
        );
    END IF;

    BEGIN
        -- Actualizar estado del pedido
        UPDATE orders
        SET status = p_new_status, updated_at = NOW()
        WHERE id = p_order_id;

        -- Restaurar inventario SOLO de los items que fueron solicitados/aprobados para devolución
        -- BUG FIX: antes restauraba TODOS los items del pedido sin filtrar por return_status
        -- Solo restaurar stock si se aprueba la devolución (no al rechazar con 'delivered')
        IF p_restore_stock AND p_new_status != 'delivered' THEN
            FOR v_order_item IN
                SELECT oi.product_id, oi.quantity
                FROM order_items oi
                WHERE oi.order_id = p_order_id
                  AND oi.return_status IN ('requested', 'approved')
            LOOP
                UPDATE products
                SET stock = stock + v_order_item.quantity
                WHERE id = v_order_item.product_id;
            END LOOP;
        END IF;

        -- Marcar los items devueltos como 'refunded' y calcular monto de reembolso
        -- Solo si NO se está rechazando (estado 'delivered')
        IF p_new_status != 'delivered' THEN
            FOR v_order_item IN
                SELECT oi.id, oi.price_at_purchase, oi.quantity
                FROM order_items oi
                WHERE oi.order_id = p_order_id
                  AND oi.return_status IN ('requested', 'approved')
            LOOP
                UPDATE order_items
                SET return_status = 'refunded',
                    return_processed_at = NOW()
                WHERE id = v_order_item.id;

                v_refund_amount := v_refund_amount + (v_order_item.price_at_purchase * v_order_item.quantity);
            END LOOP;
        ELSE
            -- Al rechazar: marcar los ítems como 'rejected'
            UPDATE order_items
            SET return_status = 'rejected',
                return_processed_at = NOW()
            WHERE order_id = p_order_id
              AND return_status IN ('requested', 'approved');
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
                WHEN p_new_status = 'delivered' THEN 'Devolución rechazada. ' || COALESCE(p_notes, '')
                WHEN p_restore_stock THEN 'Stock restaurado solo para ítems devueltos. ' || COALESCE(p_notes, '')
                ELSE p_notes
            END,
            NOW()
        );

        RETURN json_build_object(
            'success', true,
            'message', CASE WHEN p_new_status = 'delivered' THEN 'Devolución rechazada correctamente' ELSE 'Devolución procesada exitosamente' END,
            'order_id', p_order_id,
            'new_status', p_new_status,
            'stock_restored', p_restore_stock,
            'refund_amount', v_refund_amount,
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

-- Verificar
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'admin_process_return';
-- prosecdef = true ✓
