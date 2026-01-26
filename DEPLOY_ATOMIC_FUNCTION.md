#!/usr/bin/env node

/**
 * Deploy atomic coupon increment function to Supabase
 * 
 * IMPORTANT: You need to:
 * 1. Go to Supabase Dashboard > SQL Editor
 * 2. Create a new query
 * 3. Copy and paste the entire content of increment_coupon_usage_atomic.sql
 * 4. Run the query
 * 
 * OR use the Supabase CLI:
 * 
 * npx supabase db push
 * 
 * OR manually run via psql:
 * 
 * psql "postgresql://[user]:[password]@[host]/postgres" < increment_coupon_usage_atomic.sql
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  Deploy Atomic Coupon Increment Function                  ║
╚════════════════════════════════════════════════════════════════════════════╝

STEPS TO DEPLOY:

1. Option A: Manual Supabase Dashboard
   ─────────────────────────────────────
   a) Go to: https://app.supabase.com/
   b) Select your project
   c) Click "SQL Editor" in the left sidebar
   d) Click "New query"
   e) Copy the SQL from increment_coupon_usage_atomic.sql
   f) Paste it into the editor
   g) Click "Run" (or Cmd+Enter)
   h) Verify: Check that the function was created

2. Option B: Using Supabase CLI (Recommended)
   ───────────────────────────────────────
   a) npx supabase db push
   b) This will apply migrations from supabase/migrations/

3. Option C: Using psql directly
   ──────────────────────────────
   a) Get your database URL from Supabase Dashboard > Project Settings > Database
   b) Run: psql "postgresql://user:password@host/postgres" < increment_coupon_usage_atomic.sql

WHAT THE FUNCTION DOES:
───────────────────────

✓ Locks the coupon row to prevent concurrent updates (FOR UPDATE)
✓ Checks if max_uses limit has been reached
✓ If limit reached: Returns error without incrementing
✓ If valid: Atomically increments current_uses and records usage
✓ All operations happen in a single transaction (cannot be interrupted)

TESTING THE FIX:
────────────────

After deploying the function, simulate 4 concurrent coupon uses:

1. Create a test coupon with max_uses = 1
2. In the admin panel, verify it has 1/1 use
3. Try to apply it 4 more times in quick succession
4. Expected result: Only one more use should succeed (2/1), others should fail
5. If you see 5/1: The fix didn't deploy correctly

ROLLBACK (if needed):
────────────────────

If something goes wrong, you can rollback the function:

DROP FUNCTION IF EXISTS increment_coupon_usage_atomic(UUID, UUID, UUID, BIGINT);

Then redeploy after fixing.

`);
