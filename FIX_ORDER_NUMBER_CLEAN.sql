-- ==============================================
-- QUICK FIX: Reset order_number sequence properly
-- ==============================================

-- 1. Drop the unique constraint temporarily
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_unique;

-- 2. Remove all NULL order_numbers by setting them to a temp value
UPDATE orders SET order_number = 'TEMP-' || id::text WHERE order_number IS NULL;

-- 3. Remove all duplicate order_numbers keeping only the first occurrence
DELETE FROM orders o1
WHERE o1.order_number IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM orders o2
    WHERE o2.order_number = o1.order_number
      AND o2.created_at < o1.created_at
  );

-- 4. Now replace all remaining TEMP values with proper sequential numbers
DO $$
DECLARE
  rec RECORD;
  v_counter INT := 1000; -- Start from 1000 to avoid collisions
BEGIN
  FOR rec IN 
    SELECT id, created_at FROM orders WHERE order_number LIKE 'TEMP-%' ORDER BY created_at ASC
  LOOP
    UPDATE orders 
    SET order_number = 'ORD-' || TO_CHAR(rec.created_at, 'YYYY') || '-' || LPAD(v_counter::TEXT, 4, '0')
    WHERE id = rec.id;
    v_counter := v_counter + 1;
  END LOOP;
END $$;

-- 5. Reset the sequence
DROP SEQUENCE IF EXISTS order_number_seq CASCADE;
CREATE SEQUENCE order_number_seq START 1001;

-- 6. Recreate the generate_order_number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  v_seq_value BIGINT;
  v_order_number VARCHAR;
BEGIN
  v_seq_value := nextval('order_number_seq');
  v_order_number := CONCAT('ORD-', TO_CHAR(NOW(), 'YYYY'), '-', LPAD(v_seq_value::TEXT, 4, '0'));
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Re-add the UNIQUE constraint
ALTER TABLE orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- 8. Drop and recreate the create_order function
DROP FUNCTION IF EXISTS create_order(JSONB, INTEGER, JSONB, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS create_order(JSONB, INTEGER, JSONB, VARCHAR, VARCHAR, UUID, INTEGER) CASCADE;

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

  -- 2. Validate Stock for ALL items first
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
  
  -- 4. Create Order
  INSERT INTO orders (order_number, user_id, guest_email, customer_name, status, total_amount, shipping_address)
  VALUES (v_order_number, v_user_id, p_guest_email, v_customer_name, 'paid', p_total_amount, p_shipping_address) 
  RETURNING id INTO v_order_id;

  -- 5. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_item_price := (v_item->>'price')::INTEGER;

    -- Deduct Stock
    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;

    -- Create Order Item
    INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_product_id, v_quantity, v_item_price);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Done! All order_numbers are now unique and valid.
