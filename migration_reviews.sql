-- Create reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraint: one review per user per product
  UNIQUE(product_id, user_id)
);

-- Create index for faster queries
CREATE INDEX reviews_product_id_idx ON reviews(product_id);
CREATE INDEX reviews_user_id_idx ON reviews(user_id);
CREATE INDEX reviews_created_at_idx ON reviews(created_at DESC);

-- Create view for product ratings summary
CREATE VIEW product_ratings AS
SELECT 
  p.id,
  COUNT(r.id) as total_reviews,
  ROUND(AVG(r.rating)::numeric, 2) as average_rating,
  ROUND(CAST(SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) as numeric) / NULLIF(COUNT(r.id), 0) * 100, 1) as rating_5_percent,
  ROUND(CAST(SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) as numeric) / NULLIF(COUNT(r.id), 0) * 100, 1) as rating_4_percent,
  ROUND(CAST(SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) as numeric) / NULLIF(COUNT(r.id), 0) * 100, 1) as rating_3_percent,
  ROUND(CAST(SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) as numeric) / NULLIF(COUNT(r.id), 0) * 100, 1) as rating_2_percent,
  ROUND(CAST(SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as numeric) / NULLIF(COUNT(r.id), 0) * 100, 1) as rating_1_percent
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id;

-- Function to verify purchase (check if user bought the product)
CREATE OR REPLACE FUNCTION user_has_purchased_product(product_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = user_id_param
    AND oi.product_id = product_id_param
    AND o.status IN ('completed', 'shipped', 'delivered')
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read reviews (public visibility)
CREATE POLICY "reviews_are_public"
  ON reviews
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can insert reviews if they purchased the product
CREATE POLICY "users_can_create_own_reviews"
  ON reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND user_has_purchased_product(product_id, auth.uid())
  );

-- RLS Policy: Users can update their own reviews
CREATE POLICY "users_can_update_own_reviews"
  ON reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own reviews
CREATE POLICY "users_can_delete_own_reviews"
  ON reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON product_ratings TO anon, authenticated;
GRANT USAGE ON FUNCTION user_has_purchased_product TO anon, authenticated;
