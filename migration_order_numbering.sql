-- Migration: Add Order Numbering System
-- This migration adds human-readable order numbers to the orders table
-- Format: ORD-2026-XXXX (where XXXX is a sequential number)

-- ============================================
-- 1. Add order_number column if it doesn't exist
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(20);

-- ============================================
-- 2. Create sequence for order numbers
-- ============================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ============================================
-- 3. Create function to generate order numbers
-- ============================================
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

-- ============================================
-- 4. Update existing orders with order numbers
-- ============================================
-- This will assign sequential order numbers to all existing orders
-- ordered by creation date
UPDATE orders
SET order_number = 'ORD-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC)::TEXT, 4, '0')
WHERE order_number IS NULL;

-- ============================================
-- 5. Add UNIQUE constraint on order_number
-- ============================================
-- First, ensure no duplicates exist
-- Then add the constraint
ALTER TABLE orders 
ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- ============================================
-- 6. Make order_number NOT NULL
-- ============================================
ALTER TABLE orders 
ALTER COLUMN order_number SET NOT NULL;

-- ============================================
-- 7. Update the create_order RPC
-- ============================================
-- This is already updated in the database-schema.sql
-- If you're running this manually, make sure to also run the updated create_order function from database-schema.sql

CREATE OR REPLACE FUNCTION create_order(
  p_items JSONB,           -- Array of {product_id, quantity, price}
  p_total_amount INTEGER,  -- Total calculated by client
  p_shipping_address JSONB,
  p_guest_email VARCHAR DEFAULT NULL, -- Optional email for guest checkout
  p_customer_name VARCHAR DEFAULT NULL -- Customer name for email
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

  -- 3. Generate Order Number and Create Order
  v_order_number := generate_order_number();
  
  INSERT INTO orders (order_number, user_id, guest_email, customer_name, status, total_amount, shipping_address)
  VALUES (v_order_number, v_user_id, p_guest_email, v_customer_name, 'paid', p_total_amount, p_shipping_address) 
  RETURNING id INTO v_order_id;

  -- 4. Process Items
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

-- ============================================
-- DONE
-- ============================================
-- This migration is now complete. Your orders table now has:
-- 1. order_number column with unique constraint
-- 2. Sequence for generating sequential numbers
-- 3. Function to generate human-readable order numbers
-- 4. All existing orders updated with order numbers
-- 5. Updated create_order() RPC to generate order numbers for new orders
--
-- The order numbering format is: ORD-YYYY-XXXX (e.g., ORD-2026-0001, ORD-2026-0002, etc.)
