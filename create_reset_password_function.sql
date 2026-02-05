-- RPC Function to reset password using email from token
-- This function has SECURITY DEFINER so it can access auth.users
CREATE OR REPLACE FUNCTION reset_password_with_token(
  p_token TEXT,
  p_new_password TEXT
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_token_valid BOOLEAN;
BEGIN
  -- 1. Validate token exists and is not used
  SELECT user_id, email INTO v_user_id, v_email
  FROM password_reset_tokens
  WHERE token = p_token
    AND used = false
    AND expires_at > NOW();
  
  IF v_user_id IS NULL THEN
    -- Token doesn't exist, is used, or expired
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Token inválido o expirado'
    );
  END IF;

  -- If v_user_id is NULL (was inserted as NULL), find user by email
  IF v_user_id = '00000000-0000-0000-0000-000000000000'::uuid OR v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Usuario no encontrado'
      );
    END IF;
  END IF;

  -- 2. Update password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 3. Mark token as used
  UPDATE password_reset_tokens
  SET used = true, used_at = NOW()
  WHERE token = p_token;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contraseña cambiada exitosamente',
    'user_id', v_user_id
  );

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_password_with_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_password_with_token(TEXT, TEXT) TO anon;
