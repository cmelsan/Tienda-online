-- ============================================================
-- FIX: Reviews RLS + insert function
-- ============================================================
-- Problems:
--   1. user_has_purchased_product() uses 'completed' status which
--      doesn't exist in this system → always returns false → INSERT
--      policy blocks all reviews even for real buyers.
--   2. API routes can't rely on auth.uid() in server-to-server context.
--
-- Run this in your Supabase SQL editor.
-- ============================================================

-- Fix 1: Update the purchase verification function with correct statuses
CREATE OR REPLACE FUNCTION user_has_purchased_product(
  product_id_param UUID,
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = user_id_param
    AND oi.product_id = product_id_param
    AND o.status IN (
      'paid', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_returned',
      'refunded', 'partially_refunded'
    )
  );
END;
$$;

-- Fix 2: Server-side insert function that bypasses RLS entirely
-- Validates purchase + inserts review atomically
CREATE OR REPLACE FUNCTION insert_review_for_buyer(
  p_product_id UUID,
  p_user_id    UUID,
  p_rating     INTEGER,
  p_comment    TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review reviews;
BEGIN
  -- Validate rating range
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La calificación debe ser entre 1 y 5',
      'code', 'INVALID_RATING'
    );
  END IF;

  -- Verify user has purchased the product
  IF NOT user_has_purchased_product(p_product_id, p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Debes comprar el producto antes de dejar una opinión',
      'code', 'NOT_PURCHASED'
    );
  END IF;

  -- Insert review (UNIQUE constraint handles duplicates)
  BEGIN
    INSERT INTO reviews (product_id, user_id, rating, comment)
    VALUES (p_product_id, p_user_id, p_rating, p_comment)
    RETURNING * INTO v_review;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya has dejado una opinión para este producto',
      'code', 'DUPLICATE_REVIEW'
    );
  END;

  RETURN jsonb_build_object(
    'success', true,
    'review', row_to_json(v_review)
  );
END;
$$;
