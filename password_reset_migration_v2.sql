-- Make user_id nullable to support email-based password resets
-- This allows users without a registered account to still reset passwords via email

ALTER TABLE public.password_reset_tokens
ALTER COLUMN user_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
ALTER TABLE public.password_reset_tokens
DROP CONSTRAINT password_reset_tokens_user_id_fkey;

-- Add the foreign key back but allow NULL
ALTER TABLE public.password_reset_tokens
ADD CONSTRAINT password_reset_tokens_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE MATCH FULL;
