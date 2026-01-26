# 🔧 Fix: Atomic Coupon Usage - Race Condition Prevention

## ❌ Problem Identified

**Issue**: Coupon with `max_uses=1` was used **4 times** simultaneously
- Reason: Race condition in coupon validation
- The validation check and increment were **not atomic**

### How the Race Condition Happened:

```
Timeline:
─────────
T1: Request 1 → READ current_uses=0 → PASS validation (0 < 1)
T2: Request 2 → READ current_uses=0 → PASS validation (0 < 1)  ← Race condition!
T3: Request 3 → READ current_uses=0 → PASS validation (0 < 1)  ← Race condition!
T4: Request 4 → READ current_uses=0 → PASS validation (0 < 1)  ← Race condition!
T5: Request 1 → INCREMENT to 1
T6: Request 2 → INCREMENT to 2
T7: Request 3 → INCREMENT to 3
T8: Request 4 → INCREMENT to 4

Result: 4 uses despite max_uses=1 ❌
```

---

## ✅ Solution: Atomic Transaction with PostgreSQL Locking

The fix uses PostgreSQL's `FOR UPDATE` clause to lock the row and prevent concurrent modifications.

### Step 1: Deploy the Atomic Function

**Go to your Supabase Dashboard:**

1. Click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the SQL below:

```sql
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
```

4. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
5. You should see: `✓ Success`

---

### Step 2: Verify Function Created

In Supabase SQL Editor, run:

```sql
SELECT * FROM pg_proc WHERE proname = 'increment_coupon_usage_atomic';
```

Expected result: One row showing the function exists.

---

### Step 3: Code Changes (Already Done ✅)

The TypeScript code in `src/lib/coupons.ts` has been updated to use the RPC function:

**Before (Vulnerable):**
```typescript
// Read current_uses
const { data: coupon } = await supabase
  .from('coupons')
  .select('current_uses')
  .eq('id', couponId)
  .single();

// Increment (race condition can happen between read and write!)
const { error } = await supabase
  .from('coupons')
  .update({ current_uses: coupon.current_uses + 1 })
  .eq('id', couponId);
```

**After (Atomic - Safe):**
```typescript
const { data, error } = await supabase.rpc('increment_coupon_usage_atomic', {
  p_coupon_id: couponId,
  p_order_id: orderId,
  p_user_id: userId,
  p_discount_applied: discountApplied,
});
```

---

## 🧪 Testing the Fix

### Create a Test Coupon:

1. Go to Admin Dashboard > Cupones
2. Create a coupon with:
   - Código: `TEST_RACE_1`
   - Max Uses: **1**
   - Discount: €5

### Test Concurrent Usage:

1. Open **4 browser tabs** simultaneously
2. In each tab, go to your cart and:
   - Add a product (€50+)
   - Try to apply coupon `TEST_RACE_1` in quick succession
3. Expected behavior:
   - ✅ First application: Success ✅
   - ❌ 2nd, 3rd, 4th: Error "Este cupón ha alcanzado el máximo de usos"
4. Admin dashboard should show: **Usos: 1/1** (not 4/1)

---

## 🔍 How the Fix Works

### What Changed:

| Aspect | Before | After |
|--------|--------|-------|
| **Operation Type** | Two separate DB operations | Single atomic transaction |
| **Locking** | None | Row-level lock (FOR UPDATE) |
| **Concurrency** | Vulnerable to race conditions | Protected by PostgreSQL locks |
| **Validation** | Before increment | Part of atomic operation |
| **Data Integrity** | Can exceed max_uses | Guaranteed to respect max_uses |

### PostgreSQL `FOR UPDATE` Mechanism:

```
When Request 1 starts:
  1. SELECT ... FOR UPDATE → Locks the coupon row
  2. Other requests WAIT (blocked) until lock is released
  3. Request 1 finishes → Lock released
  4. Request 2 acquires lock and repeats
  5. If Request 2 finds max_uses reached → Returns error
```

This ensures **only one request can increment at a time**.

---

## ✨ Deployment Steps

1. **Deploy the SQL function** (via Supabase Dashboard)
   - Follow Step 1 above
   
2. **Code changes already applied** ✅
   - `src/lib/coupons.ts` updated to use atomic RPC
   
3. **Test the fix**
   - Follow testing steps above
   
4. **Commit and push to GitHub**
   - Git will automatically detect the code change
   - The SQL migration should be documented

---

## 📝 SQL File Reference

If you need to redeploy or have the SQL in a separate file:
- File: `increment_coupon_usage_atomic.sql`
- Location: Root of project

---

## 🆘 Troubleshooting

### Function Not Found Error

**Error**: `Undefined function: increment_coupon_usage_atomic`

**Solution**: 
1. Verify function was created: `SELECT * FROM pg_proc WHERE proname = 'increment_coupon_usage_atomic';`
2. If not found, re-run the CREATE FUNCTION SQL

### Still Seeing Race Condition

**If coupon still goes over max_uses:**
1. Check that `src/lib/coupons.ts` has the RPC call
2. Clear browser cache and restart dev server
3. Test in a fresh incognito window

### Manual Function Reset

If you need to delete and recreate the function:

```sql
-- Drop the function
DROP FUNCTION IF EXISTS increment_coupon_usage_atomic(UUID, UUID, UUID, BIGINT);

-- Then re-run the CREATE FUNCTION SQL from Step 1
```

---

## 📚 Technical Details

**PostgreSQL Features Used:**
- `FOR UPDATE` - Row-level locking for transactions
- `DECLARE` - Variable declarations
- `RETURN jsonb_build_object()` - JSON response building
- `PLPGSQL` - PostgreSQL procedural language

**Safety Guarantees:**
- ✅ Only one concurrent increment per coupon
- ✅ Max uses limit always respected
- ✅ No phantom reads or dirty reads
- ✅ Automatic rollback on error

---

## 🎯 Next Steps

1. ✅ Deploy the SQL function (follow Step 1)
2. ✅ Test with concurrent requests
3. ✅ Commit changes to GitHub
4. ✅ Monitor admin dashboard for correct counts

**Status**: Ready for deployment 🚀
