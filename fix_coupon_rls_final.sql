-- ============================================================
-- FIX: Coupon reuse prevention at validation level
-- ============================================================
-- Problem: validateCoupon() queries coupon_usage with the anon
-- Supabase client. RLS returns 0 rows for anon requests → the
-- per-user check always passes → coupons are always "unused".
--
-- Fix: SECURITY DEFINER functions that run as DB owner,
-- bypassing RLS for both the usage check and the insert.
--
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Function to check if a user has already used a coupon
--    Called from validateCoupon() in coupons.ts during checkout
CREATE OR REPLACE FUNCTION check_coupon_used_by_user(
  p_coupon_id UUID,
  p_user_id   UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coupon_usage
    WHERE coupon_id = p_coupon_id
      AND user_id   = p_user_id
  );
END;
$$;

-- 2. Re-deploy increment_coupon_usage_atomic with SECURITY DEFINER
--    (in case the previous version was not yet executed)
CREATE OR REPLACE FUNCTION increment_coupon_usage_atomic(
  p_coupon_id      UUID,
  p_order_id       UUID,
  p_user_id        UUID,
  p_discount_applied NUMERIC          -- matches coupon_usage.discount_applied type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon   RECORD;
  v_new_uses INT;
BEGIN
  -- Lock the coupon row for the duration of this transaction
  SELECT id, current_uses, max_uses
  INTO v_coupon
  FROM coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon not found');
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

  -- Check per-user uniqueness
  IF p_user_id IS NOT NULL THEN
    IF check_coupon_used_by_user(p_coupon_id, p_user_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User has already used this coupon'
      );
    END IF;
  END IF;

  -- Increment counter atomically
  v_new_uses := v_coupon.current_uses + 1;
  UPDATE coupons
  SET current_uses = v_new_uses,
      updated_at   = NOW()
  WHERE id = p_coupon_id;

  -- Record usage (used_at defaults to NOW())
  INSERT INTO coupon_usage (coupon_id, order_id, user_id, discount_applied)
  VALUES (p_coupon_id, p_order_id, p_user_id, p_discount_applied);

  RETURN jsonb_build_object('success', true, 'new_uses', v_new_uses);
END;
$$;

-- 3. Unique index to block concurrent duplicate inserts
CREATE UNIQUE INDEX IF NOT EXISTS coupon_usage_one_per_user
  ON public.coupon_usage (coupon_id, user_id)
  WHERE user_id IS NOT NULL;
