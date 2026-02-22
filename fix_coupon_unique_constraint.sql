-- ============================================================
-- FIX: Coupon one-use-per-user enforcement
-- ============================================================
-- Problems fixed:
--   1. increment_coupon_usage_atomic inserted into column 'created_at'
--      which does not exist in coupon_usage (column is 'used_at').
--      This caused every INSERT to fail → usage was never recorded
--      → users could reuse coupons indefinitely.
--   2. No DB-level UNIQUE constraint existed on (coupon_id, user_id).
--
-- Run this in your Supabase SQL editor.
-- ============================================================

-- Step 1: Remove duplicate coupon_usage rows caused by the bug
-- Keeps only the FIRST usage per (coupon_id, user_id), deletes the rest.
DELETE FROM public.coupon_usage
WHERE id NOT IN (
  SELECT DISTINCT ON (coupon_id, user_id) id
  FROM public.coupon_usage
  WHERE user_id IS NOT NULL
  ORDER BY coupon_id, user_id, used_at ASC
)
AND user_id IS NOT NULL;

-- Also fix current_uses counter on affected coupons to match real usage count
UPDATE public.coupons c
SET current_uses = (
  SELECT COUNT(*) FROM public.coupon_usage cu WHERE cu.coupon_id = c.id
);

-- Step 2: Add DB-level UNIQUE constraint so even concurrent requests
-- cannot insert duplicate (coupon_id, user_id) rows.
-- Partial index: only applies when user_id IS NOT NULL (guests excluded).
CREATE UNIQUE INDEX IF NOT EXISTS coupon_usage_one_per_user
  ON public.coupon_usage (coupon_id, user_id)
  WHERE user_id IS NOT NULL;

-- Step 3: Replace the atomic function with the corrected INSERT + SECURITY DEFINER
-- SECURITY DEFINER: function runs with DB owner privileges, bypassing RLS.
-- This is safe because the function validates everything before writing.
CREATE OR REPLACE FUNCTION increment_coupon_usage_atomic(
  p_coupon_id UUID,
  p_order_id UUID,
  p_user_id UUID,
  p_discount_applied BIGINT
) RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_new_uses INT;
BEGIN
  -- Lock the coupon row for the duration of this transaction
  SELECT id, current_uses, max_uses
  INTO v_coupon
  FROM coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coupon not found'
    );
  END IF;

  -- Check global max_uses limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coupon has reached maximum usage limit',
      'current_uses', v_coupon.current_uses,
      'max_uses', v_coupon.max_uses
    );
  END IF;

  -- Check per-user uniqueness (one use per user)
  IF p_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM coupon_usage
      WHERE coupon_id = p_coupon_id AND user_id = p_user_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User has already used this coupon'
      );
    END IF;
  END IF;

  -- Increment the usage counter atomically
  v_new_uses := v_coupon.current_uses + 1;
  UPDATE coupons
  SET current_uses = v_new_uses,
      updated_at   = NOW()
  WHERE id = p_coupon_id;

  -- Record the usage (used_at defaults to NOW())
  INSERT INTO coupon_usage (coupon_id, order_id, user_id, discount_applied)
  VALUES (p_coupon_id, p_order_id, p_user_id, p_discount_applied);

  RETURN jsonb_build_object(
    'success', true,
    'new_uses', v_new_uses
  );
END;
$$ LANGUAGE plpgsql;
