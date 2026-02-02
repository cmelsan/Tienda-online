-- Migration: Fix order status constraint to use 'awaiting_payment' instead of 'pending'
-- This resolves the issue where status updates were failing silently due to CHECK constraint validation

-- Step 1: Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT orders_status_check;

-- Step 2: Add the corrected constraint with 'awaiting_payment' instead of 'pending'
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY['awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded']));

-- Step 3: Update all existing 'pending' status orders to 'awaiting_payment'
UPDATE orders SET status = 'awaiting_payment' WHERE status = 'pending';

-- Step 4: Update the default value to 'awaiting_payment'
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'awaiting_payment';

-- Verification
SELECT DISTINCT status FROM orders ORDER BY status;
