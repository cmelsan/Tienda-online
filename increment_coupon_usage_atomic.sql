-- Create atomic coupon increment function
-- This function validates max_uses limit and increments in a single transaction
-- preventing race conditions from concurrent requests

CREATE OR REPLACE FUNCTION increment_coupon_usage_atomic(
  p_coupon_id UUID,
  p_order_id UUID,
  p_user_id UUID,
  p_discount_applied BIGINT
) RETURNS jsonb AS $$
DECLARE
  v_coupon RECORD;
  v_new_uses INT;
BEGIN
  -- Lock the coupon row for the duration of this transaction
  -- This prevents concurrent updates
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

  -- Check if max_uses limit has been reached
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coupon has reached maximum usage limit',
      'current_uses', v_coupon.current_uses,
      'max_uses', v_coupon.max_uses
    );
  END IF;

  -- Increment the usage counter
  v_new_uses := v_coupon.current_uses + 1;
  UPDATE coupons
  SET current_uses = v_new_uses
  WHERE id = p_coupon_id;

  -- Record the usage
  INSERT INTO coupon_usage (coupon_id, order_id, user_id, discount_applied, created_at)
  VALUES (p_coupon_id, p_order_id, p_user_id, p_discount_applied, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'new_uses', v_new_uses
  );
END;
$$ LANGUAGE plpgsql;
