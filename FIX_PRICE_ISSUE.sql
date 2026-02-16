-- ============================================================================
-- FIX PRICE CONVERSION ISSUE
-- ============================================================================
-- Problem: Frontend sends cents, but API was multiplying by 100 again
-- Result: 40€ was stored as 400000 instead of 4000
-- Solution: Divide by 100 products that are suspiciously expensive

-- STEP 1: Check products with obviously wrong prices (over 100€ / > 10000 cents)
-- Most beauty products shouldn't exceed 500€
SELECT 
  id,
  name,
  price,
  ROUND(price::numeric / 100, 2) as price_in_euros,
  created_at
FROM products
WHERE price > 50000  -- Over 500€ is suspicious for beauty products
ORDER BY price DESC;

-- ============================================================================
-- STEP 2: If you see products that should be ~40€ shown as 4000€, run this:
-- ============================================================================
-- FIX: Divide prices by 100 for affected products
-- WARNING: Only run this if you confirmed products are affected
UPDATE products
SET price = FLOOR(price / 100)
WHERE price > 50000;  -- Only fix suspicious prices

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================
SELECT 
  id,
  name,
  price,
  ROUND(price::numeric / 100, 2) as price_in_euros
FROM products
ORDER BY price DESC
LIMIT 20;
