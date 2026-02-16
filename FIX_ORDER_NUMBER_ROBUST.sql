-- ==============================================
-- FIX: order_number duplicates and NULL errors (ROBUST VERSION)
-- ==============================================
-- This script handles existing duplicates and resets the sequence properly

-- 1. Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- 2. Create/replace the order number generation function
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

-- 3. Ensure order_number column exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(20);

-- 4. Remove the unique constraint if it exists (we'll recreate it after cleaning)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_unique;

-- 5. Handle duplicates: Keep only the first occurrence of each duplicate order_number
DELETE FROM orders o1
WHERE order_number IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM orders o2
    WHERE o2.order_number = o1.order_number
      AND o2.id < o1.id
  );

-- 6. Clear NULL order_numbers (optional - set to NULL if they exist)
-- This ensures we can regenerate clean numbers below

-- 7. Fill NULL order_numbers with unique sequential numbers
DO $$
DECLARE
  rec RECORD;
  v_counter INT := 0;
  v_max_seq INT;
BEGIN
  -- Get the maximum sequence value from existing non-null order_numbers
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INT)), 0) INTO v_max_seq
  FROM orders
  WHERE order_number IS NOT NULL;
  
  v_counter := v_max_seq;
  
  -- Now assign new numbers to remaining NULLs
  FOR rec IN 
    SELECT id, created_at FROM orders WHERE order_number IS NULL ORDER BY created_at ASC
  LOOP
    v_counter := v_counter + 1;
    UPDATE orders 
    SET order_number = 'ORD-' || TO_CHAR(rec.created_at, 'YYYY') || '-' || LPAD(v_counter::TEXT, 4, '0')
    WHERE id = rec.id;
  END LOOP;
  
  -- Reset the sequence to be ahead of all current numbers
  PERFORM setval('order_number_seq', v_counter + 1);
END $$;

-- 8. Make order_number NOT NULL if not already
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;

-- 9. Add unique constraint (now safe because duplicates are removed)
ALTER TABLE orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- 10. Drop old create_order overloads
DO $$
DECLARE
  func_oid oid;
BEGIN
  FOR func_oid IN
    SELECT p.oid FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_order' AND n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_oid::regprocedure);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop old create_order: %', SQLERRM;
END $$;

-- 11. Create new create_order with ALL params
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

-- Done! The duplicate issue is now resolved.
