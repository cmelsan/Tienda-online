-- FIX RLS PERMISSIONS FOR APP_SETTINGS
-- Ejecuta este script en tu Supabase SQL Editor

-- OPCIÓN 1: Deshabilitar RLS completamente (recomendado para app_settings)
-- app_settings es configuración global, no necesita RLS
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2 (alternativa): Crear políticas RLS permisivas para autenticados
-- Descomenta las líneas de abajo si prefieres mantener RLS con políticas

-- ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- -- Permitir a todos leer (necesario para la home pública)
-- CREATE POLICY "Allow public read app_settings"
--   ON public.app_settings
--   FOR SELECT
--   USING (true);

-- -- Permitir a usuarios autenticados actualizar (para admin)
-- CREATE POLICY "Allow authenticated users update app_settings"
--   ON public.app_settings
--   FOR UPDATE
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users insert app_settings"
--   ON public.app_settings
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

