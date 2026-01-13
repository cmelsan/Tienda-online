# ÉCLAT - Guía de Configuración Rápida

## 📋 Pasos para Poner en Marcha

### 1. Configurar Supabase (5 minutos)

1. **Crear proyecto en Supabase**
   - Ve a https://supabase.com
   - Crea un nuevo proyecto
   - Anota la URL y la clave anon

2. **Ejecutar el schema SQL**
   - Abre Supabase Dashboard → SQL Editor
   - Copia todo el contenido de `database-schema.sql`
   - Pega y ejecuta
   - Verifica que se crearon las tablas

3. **Configurar Storage**
   - Ve a Storage → Create bucket
   - Nombre: `products-images`
   - Marca como público

### 2. Configurar Variables de Entorno

Crea `.env` en la raíz:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

### 3. Ejecutar el Proyecto

```bash
# Las dependencias ya están instaladas
npm run dev
```

Abre http://localhost:4321

### 4. Acceder al Admin

1. Crea un usuario en Supabase Authentication
2. Ve a http://localhost:4321/admin/login
3. Inicia sesión con tus credenciales

## 🎯 Verificación Rápida

- ✅ Homepage carga con diseño premium
- ✅ Productos se muestran en el catálogo
- ✅ Puedes añadir productos al carrito
- ✅ El carrito se abre con el icono
- ✅ Puedes acceder al admin con login

## 📦 Estructura de Archivos Clave

- `database-schema.sql` - Schema completo de la BD
- `.env.example` - Template de variables de entorno
- `src/lib/supabase.ts` - Cliente Supabase
- `src/stores/cart.ts` - Lógica del carrito
- `README.md` - Documentación completa

## 🆘 Problemas Comunes

**Error: Missing Supabase environment variables**
→ Verifica que `.env` existe y tiene las variables correctas

**No se ven productos**
→ Verifica que ejecutaste el schema SQL en Supabase

**No puedo hacer login**
→ Crea un usuario en Supabase Authentication primero

## 📚 Documentación Completa

Lee `README.md` y `walkthrough.md` para información detallada.
