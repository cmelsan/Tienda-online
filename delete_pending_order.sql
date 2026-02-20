-- Function to safely delete an order that is still in 'awaiting_payment' status.
-- Uses SECURITY DEFINER so it runs with elevated permissions (bypasses RLS).
-- Safe because: no payment collected, no stock deducted for these orders.

CREATE OR REPLACE FUNCTION delete_pending_order(p_order_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Verify order exists and is still awaiting_payment
  SELECT id, status INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not in awaiting_payment status');
  END IF;

  -- Delete order items first (FK constraint)
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- Delete the order
  DELETE FROM orders WHERE id = p_order_id AND status = 'awaiting_payment';

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- Allow anyone to call it (the function itself validates the order status)
GRANT EXECUTE ON FUNCTION delete_pending_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_pending_order(UUID) TO anon;
