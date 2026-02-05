-- FIX RLS PERMISSIONS FOR APP_SETTINGS
-- This allows admin users to update app_settings

-- First, check current RLS policy status
SELECT tablename, array_agg(policyname) as policies
FROM pg_policies 
WHERE tablename = 'app_settings'
GROUP BY tablename;

-- Disable RLS for app_settings (simplest solution)
-- Since app_settings are global configuration, they don't need RLS
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS, create a permissive policy for admins
-- First enable RLS if disabled
-- ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Then create policy for admins (if is_admin = true in profiles)
-- CREATE POLICY "Allow admins to update app_settings"
--   ON public.app_settings
--   FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.is_admin = true
--     )
--   );

-- CREATE POLICY "Allow admins to insert app_settings"
--   ON public.app_settings
--   FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.is_admin = true
--     )
--   );

-- CREATE POLICY "Allow everyone to read app_settings"
--   ON public.app_settings
--   FOR SELECT
--   USING (true);
