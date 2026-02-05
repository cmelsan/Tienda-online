-- Create a function to find user by email in auth.users
-- This bypasses the profiles table limitation

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  user_metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.users.id,
    auth.users.email,
    auth.users.user_metadata
  FROM auth.users
  WHERE LOWER(auth.users.email) = LOWER(p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO anon, authenticated;
