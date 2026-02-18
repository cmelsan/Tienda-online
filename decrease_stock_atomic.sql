-- Atomic Stock Deduction Function
-- Prevents race conditions when multiple users purchase the same product simultaneously
-- Uses PostgreSQL row-level locking (FOR UPDATE) to ensure atomicity

CREATE OR REPLACE FUNCTION decrease_product_stock_atomic(
  p_product_id UUID,
  p_quantity INT
) RETURNS jsonb AS $$
DECLARE
  v_product RECORD;
  v_new_stock INT;
BEGIN
  -- Lock the product row for the duration of this transaction
  -- This prevents concurrent stock modifications
  SELECT id, stock, name 
  INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found',
      'product_id', p_product_id
    );
  END IF;

  -- Validate quantity is positive
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid quantity',
      'quantity', p_quantity
    );
  END IF;

  -- Check if sufficient stock is available
  IF v_product.stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock',
      'product_name', v_product.name,
      'available', v_product.stock,
      'requested', p_quantity
    );
  END IF;

  -- Decrement stock atomically
  v_new_stock := v_product.stock - p_quantity;
  UPDATE products
  SET stock = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'product_name', v_product.name,
    'new_stock', v_new_stock,
    'quantity_deducted', p_quantity
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and anonymous users
-- (API will handle authorization)
GRANT EXECUTE ON FUNCTION decrease_product_stock_atomic(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrease_product_stock_atomic(UUID, INT) TO anon;
