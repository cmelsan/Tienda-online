-- Create a table to map emails to user_ids for password reset functionality
-- This solves the problem of users registering but not having profiles

CREATE TABLE IF NOT EXISTS public.email_user_mapping (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_user_mapping_pkey PRIMARY KEY (id),
  CONSTRAINT email_user_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT email_user_mapping_user_id_email_unique UNIQUE(user_id, email)
);

CREATE INDEX idx_email_user_mapping_email ON public.email_user_mapping(LOWER(email));
CREATE INDEX idx_email_user_mapping_user_id ON public.email_user_mapping(user_id);

-- Optional: Populate from orders table where user_id is not null
INSERT INTO public.email_user_mapping (user_id, email)
SELECT DISTINCT user_id, guest_email
FROM orders
WHERE user_id IS NOT NULL 
  AND guest_email IS NOT NULL
  AND guest_email != ''
ON CONFLICT (user_id, email) DO NOTHING;

-- Optional: Create a trigger to auto-populate this table when auth.users are created
-- This would require a trigger function, but we'll do it via application code instead
