# 🚀 Pasos para Activar Flash Sales en Tu Servidor

## PASO 1: Ejecutar SQL en Supabase ⚡

1. **Ve a tu panel de Supabase**
   - https://supabase.com (inicia sesión)
   - Selecciona tu proyecto
   - Abre **SQL Editor** (en la izquierda)

2. **Copia y pega este script completo:**
   ```sql
   -- ============================================================
   -- SCRIPT DE VERIFICACIÓN Y CONFIGURACIÓN FLASH SALES
   -- ============================================================
   
   -- 1. VERIFICAR Y CREAR CAMPOS
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'products' AND column_name = 'is_flash_sale'
     ) THEN
       ALTER TABLE public.products ADD COLUMN is_flash_sale boolean DEFAULT false;
     END IF;
   
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'products' AND column_name = 'flash_sale_discount'
     ) THEN
       ALTER TABLE public.products ADD COLUMN flash_sale_discount numeric DEFAULT 0;
     END IF;
   
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'products' AND column_name = 'flash_sale_end_time'
     ) THEN
       ALTER TABLE public.products ADD COLUMN flash_sale_end_time timestamp with time zone;
     END IF;
   END $$;
   
   -- 2. CREAR ÍNDICES
   CREATE INDEX IF NOT EXISTS idx_products_is_flash_sale 
   ON public.products(is_flash_sale) WHERE is_flash_sale = true;
   
   CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);
   
   -- 3. HABILITAR FLASH SALES
   INSERT INTO public.app_settings (key, value, updated_at)
   VALUES ('flash_sale_enabled', 'true'::jsonb, now())
   ON CONFLICT (key) DO UPDATE SET 
     value = 'true'::jsonb,
     updated_at = now();
   
   -- 4. CREAR PRODUCTOS DE EJEMPLO
   UPDATE public.products
   SET 
     is_flash_sale = true,
     flash_sale_discount = 25,
     flash_sale_end_time = now() + interval '24 hours'
   WHERE id IN (
     SELECT id FROM public.products 
     ORDER BY created_at DESC 
     LIMIT 4
   )
   AND is_flash_sale = false;
   ```

3. **Haz clic en "RUN"** (botón verde superior derecho)

4. **Verifica que dice:**
   - ✅ Configuración guardada: flash_sale_enabled = true
   - ✅ 4 productos en Flash Sale (o similar)
   - ✅ Otros resultados sin errores

---

## PASO 2: Redeploy tu Servidor 🔄

Dependiendo de dónde está hosteado:

### Si es en Vercel:
```bash
git push  # Ya lo hiciste
# Vercel detectará automáticamente los cambios
# Espera ~2-3 minutos para que se redeploy
```

### Si es en tu servidor:
```bash
cd /tu/ruta/proyecto
git pull origin main
npm install
npm run build
# Reinicia tu servidor (dependiendo del hosting)
```

### Si es en Docker:
```bash
git pull origin main
docker build -t tu-app .
docker run -d tu-app
```

---

## PASO 3: Verificar en el Navegador ✅

1. **Ve a la página de inicio:**
   - https://tudominio.com/ (tu servidor)

2. **Busca la sección:**
   - Deberías ver **"⚡ Flash Sale Exclusivo"** con los productos

3. **Si NO ves nada:**

   **OPCIÓN A - Fuerza el caché:**
   - Abre DevTools: `F12`
   - Pestaña **Network**
   - Haz clic derecho en el botón "Recargar" → "Vaciar caché y recargar"
   - O presiona: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)

   **OPCIÓN B - Verifica la consola:**
   - Abre DevTools: `F12`
   - Pestaña **Console**
   - Busca errores rojos
   - Copia el error y mándamelo

4. **Si ves la sección pero SIN productos:**
   - El CSS está correcto pero no hay datos
   - Vuelve a Supabase SQL Editor
   - Ejecuta solo esta línea:
     ```sql
     SELECT COUNT(*) as "Flash Sales Activas" FROM products WHERE is_flash_sale = true;
     ```
   - Si muestra 0: vuelve a ejecutar el script completo del PASO 1

---

## PASO 4: Administrar Flash Sales 🎛️

**URL:** https://tudominio.com/admin/configuracion

1. **Sección "Configuración General"**
   - Activa el toggle: **⚡ Flash Sales en Inicio**
   - Deberías ver mensaje verde: "Configuración actualizada"

2. **Sección "Gestor de Flash Sales"**
   - Busca productos en la tabla
   - Haz clic en **"Inactivo"** para activar como flash sale
   - Establece **descuento %** (ej: 20)
   - Define **fecha de fin** (ej: Mañana 23:59)

3. **Vuelve a inicio** (`/`)
   - Deberías ver los productos actualizados

---

## 🔍 Depuración Si Aún No Funciona

### Checklist:

- [ ] ¿Ejecutaste el SQL en Supabase? (No en git, en el SQL Editor)
- [ ] ¿El comando corrió sin errores? (Sin red)
- [ ] ¿Ves 4+ productos en la consulta final?
- [ ] ¿`flash_sale_enabled` está en `true`?
- [ ] ¿Recargaste el navegador con Ctrl+Shift+R?
- [ ] ¿Revisaste la consola (F12) para errores?

### Si aún falla:

**Ejecuta esto en Supabase SQL Editor:**
```sql
-- Muestra TODO sobre Flash Sales
SELECT * FROM app_settings WHERE key LIKE 'flash%';

-- Muestra productos en flash sale
SELECT id, name, is_flash_sale, flash_sale_discount FROM products WHERE is_flash_sale = true;

-- Muestra configuración global
SELECT COUNT(*) as total_productos, COUNT(CASE WHEN is_flash_sale THEN 1 END) as en_flash_sale FROM products;
```

Y comparte el resultado aquí.

---

## 📝 Resumen Rápido

| Paso | Acción | Estado |
|------|--------|--------|
| 1 | Ejecutar SQL en Supabase | ⏳ Pendiente |
| 2 | Redeploy servidor | ⏳ Pendiente |
| 3 | Verificar navegador (Ctrl+Shift+R) | ⏳ Pendiente |
| 4 | Administrar en `/admin/configuracion` | ⏳ Pendiente |
