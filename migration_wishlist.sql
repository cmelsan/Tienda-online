-- Tabla de Deseos / Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own wishlist
CREATE POLICY "Users can view their own wishlist" 
ON wishlist FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert into their own wishlist
CREATE POLICY "Users can add to their own wishlist" 
ON wishlist FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete from their own wishlist
CREATE POLICY "Users can remove from their own wishlist" 
ON wishlist FOR DELETE 
USING (auth.uid() = user_id);
