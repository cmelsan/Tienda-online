-- ============================================================
-- RPC FUNCTIONS FOR ADMIN POST-SALE MANAGEMENT
-- EXECUTE IN SUPABASE SQL EDITOR
-- ============================================================

-- ============================================================
-- RPC #1: CANCEL ORDER (ATOMIC)
-- Conditions: status = 'paid' ONLY
-- Actions:
--   1. Update orders.status -> 'cancelled'
--   2. Restore products.stock += order_items.quantity
--   3. Insert order_status_history record
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
    -- Validate: Order exists and status is 'paid'
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order not found',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    IF v_order.status != 'paid' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Can only cancel orders with status paid',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    -- START TRANSACTION (implicit in plpgsql)
    BEGIN
        -- 1. Update order status to 'cancelled'
        UPDATE orders
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = p_order_id;

        -- 2. Restore stock for each product in order
        FOR v_order_item IN 
            SELECT oi.product_id, oi.quantity 
            FROM order_items oi 
            WHERE oi.order_id = p_order_id
        LOOP
            UPDATE products
            SET stock = stock + v_order_item.quantity
            WHERE id = v_order_item.product_id;
        END LOOP;

        -- 3. Insert history record
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
        -- Rollback is automatic on error in plpgsql
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'TRANSACTION_ERROR'
        );
    END;
END;
$$;

-- ============================================================
-- RPC #2: MARK SHIPPED
-- Conditions: status = 'paid'
-- Actions:
--   1. Update orders.status -> 'shipped'
--   2. Insert order_status_history record
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
    -- Validate
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order not found',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    IF v_order.status != 'paid' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Can only mark paid orders as shipped',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    BEGIN
        -- Update status
        UPDATE orders
        SET status = 'shipped', updated_at = NOW()
        WHERE id = p_order_id;

        -- Insert history
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
-- RPC #3: MARK DELIVERED
-- Conditions: status = 'shipped'
-- Actions:
--   1. Update orders.status -> 'delivered'
--   2. Set orders.delivered_at = NOW()
--   3. Set orders.return_deadline = NOW() + 14 days
--   4. Insert order_status_history record
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
            'error', 'Order not found',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    IF v_order.status != 'shipped' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Can only mark shipped orders as delivered',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    BEGIN
        -- Update status and timestamps
        UPDATE orders
        SET 
            status = 'delivered',
            delivered_at = NOW(),
            return_deadline = NOW() + INTERVAL '14 days',
            updated_at = NOW()
        WHERE id = p_order_id;

        -- Insert history
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
-- RPC #4: PROCESS RETURN / REFUND
-- Conditions: status = 'return_requested' or 'returned'
-- Actions:
--   1. Update orders.status -> 'returned' or 'refunded'
--   2. Insert order_status_history record
--   3. Optionally restore stock (for return_requested -> returned)
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
    v_allowed_to_status TEXT[] := ARRAY['returned', 'refunded'];
BEGIN
    -- Validate
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order not found',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    -- Validate current status
    IF NOT v_order.status = ANY(v_allowed_from_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order must be in return_requested or returned status',
            'current_status', v_order.status,
            'code', 'INVALID_ORDER_STATUS'
        );
    END IF;

    -- Validate new status
    IF NOT p_new_status = ANY(v_allowed_to_status) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid new status. Must be returned or refunded',
            'provided_status', p_new_status,
            'code', 'INVALID_NEW_STATUS'
        );
    END IF;

    BEGIN
        -- Update status
        UPDATE orders
        SET status = p_new_status, updated_at = NOW()
        WHERE id = p_order_id;

        -- Optionally restore stock
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

        -- Insert history
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
                WHEN p_restore_stock THEN 'Stock restored. ' || COALESCE(p_notes, '')
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
-- RPC #5: GET ORDER ACTIONS (Helper)
-- Returns available actions for current order status
-- Useful for UI to determine which buttons to show
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
        RETURN json_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- Determine available actions based on status
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
-- GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION admin_cancel_order_atomic(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_shipped(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_delivered(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_process_return(UUID, UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_available_actions(UUID) TO authenticated;

-- ============================================================
-- NOTES:
-- 1. All functions use SECURITY DEFINER to bypass RLS
-- 2. Remember to add authentication check in your API layer
-- 3. Stock restoration is automatic in cancel_order_atomic
-- 4. return_deadline is calculated at delivery time
-- 5. All timestamps are in UTC (NOW())
-- ============================================================
