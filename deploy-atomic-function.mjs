import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role key for RPC creation

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// SQL to create the atomic function
const SQL = `
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
`;

async function deployFunction() {
  try {
    console.log('🚀 Deploying atomic coupon increment function to Supabase...\n');
    
    // Execute the SQL using the rpc method
    // Actually, we need to use the raw SQL endpoint
    // For now, let's just log the SQL and provide manual instructions
    
    console.log('Since creating functions requires admin access, you need to:');
    console.log('');
    console.log('1️⃣  Go to Supabase Dashboard');
    console.log('2️⃣  Navigate to: SQL Editor > New Query');
    console.log('3️⃣  Copy and paste the following SQL:');
    console.log('');
    console.log('─'.repeat(80));
    console.log(SQL);
    console.log('─'.repeat(80));
    console.log('');
    console.log('4️⃣  Click "Run" to execute');
    console.log('');
    console.log('✅ After deployment, the increment_coupon_usage_atomic function will be available');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deployFunction();
