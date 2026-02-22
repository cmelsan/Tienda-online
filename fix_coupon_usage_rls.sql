-- ============================================
-- FIX: Coupon usage check without service role key
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 0. CONSTRAINT ÚNICO — barrera definitiva a nivel de BD
--    Aunque el código falle, la BD rechaza el segundo uso con un error

-- Primero: limpiar duplicados existentes (si los hay por el bug)
-- Conserva solo el PRIMER uso de cada (coupon_id, user_id)
DELETE FROM public.coupon_usage cu1
WHERE user_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (coupon_id, user_id) id
    FROM public.coupon_usage
    WHERE user_id IS NOT NULL
    ORDER BY coupon_id, user_id, used_at ASC
  );

ALTER TABLE public.coupon_usage
  DROP CONSTRAINT IF EXISTS coupon_usage_unique_user_coupon;

ALTER TABLE public.coupon_usage
  ADD CONSTRAINT coupon_usage_unique_user_coupon
  UNIQUE (coupon_id, user_id);

-- 1. RLS en coupon_usage (por si acaso)
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_usage_select_own" ON public.coupon_usage;

CREATE POLICY "coupon_usage_select_own"
  ON public.coupon_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Recrear check_coupon_used_by_user como SECURITY DEFINER
--    Esto permite que funcione sin service role key (anon/authenticated pueden llamarla)
CREATE OR REPLACE FUNCTION check_coupon_used_by_user(
  p_coupon_id UUID,
  p_user_id UUID
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.coupon_usage
    WHERE coupon_id = p_coupon_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- 3. Recrear increment_coupon_usage_atomic como SECURITY DEFINER
--    El webhook de Stripe llama esto sin token de usuario
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

  -- Check per-user limit (one use per user)
  IF p_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM coupon_usage
      WHERE coupon_id = p_coupon_id AND user_id = p_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'User has already used this coupon');
    END IF;
  END IF;

  -- Increment usage counter
  v_new_uses := v_coupon.current_uses + 1;
  UPDATE coupons SET current_uses = v_new_uses WHERE id = p_coupon_id;

  -- Record usage
  INSERT INTO coupon_usage (coupon_id, order_id, user_id, discount_applied)
  VALUES (p_coupon_id, p_order_id, p_user_id, p_discount_applied);

  RETURN jsonb_build_object('success', true, 'new_uses', v_new_uses);

EXCEPTION
  WHEN unique_violation THEN
    -- UNIQUE constraint (coupon_id, user_id) fired — double use attempt at DB level
    RETURN jsonb_build_object('success', false, 'error', 'User has already used this coupon (unique constraint)');
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- 4. Verificar
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('check_coupon_used_by_user', 'increment_coupon_usage_atomic');
-- prosecdef = true significa SECURITY DEFINER ✓
