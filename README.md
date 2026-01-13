# ÉCLAT Beauty E-commerce Platform

Una tienda online premium de belleza y cuidado personal construida con Astro 5, Supabase y Nano Stores.

## 🚀 Stack Tecnológico

- **Frontend**: Astro 5.0 (modo híbrido)
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Estado**: Nano Stores
- **Islas Interactivas**: React

## 📋 Requisitos Previos

- Node.js 18+ 
- Cuenta de Supabase
- npm o pnpm

## 🛠️ Instalación

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

Edita `.env` y añade tus credenciales de Supabase:
```env
PUBLIC_SUPABASE_URL=tu_url_de_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

3. **Configurar base de datos**:
   - Ve a tu proyecto en Supabase
   - Abre el SQL Editor
   - Ejecuta el contenido de `database-schema.sql`

4. **Configurar Storage**:
   - Ve a Storage en Supabase
   - Crea un bucket llamado `products-images`
   - Configúralo como público

## 🎨 Desarrollo

```bash
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321)

## 🏗️ Build

```bash
npm run build
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ui/              # Componentes UI reutilizables
│   ├── product/         # Componentes de productos
│   └── islands/         # Islas interactivas (React)
├── layouts/             # Layouts de página
├── lib/                 # Utilidades y configuración
├── pages/               # Rutas de la aplicación
├── stores/              # Nano Stores (carrito)
└── middleware.ts        # Middleware de autenticación
```

## 🔐 Autenticación Admin

Para acceder al panel de administración:

1. Crea un usuario en Supabase Authentication
2. Inicia sesión en `/admin/login`

## 📦 Características

### Tienda Pública (SSG)
- ✅ Catálogo de productos
- ✅ Filtrado por categorías
- ✅ Fichas de producto detalladas
- ✅ Carrito de compra persistente

### Panel de Administración (SSR)
- ✅ Dashboard con estadísticas
- ✅ CRUD completo de productos
- ✅ Gestión de stock
- ✅ Subida de imágenes

## 🎯 Categorías

- Maquillaje
- Cabello
- Cuerpo
- Perfumes

## 📝 Licencia

Proyecto académico - ÉCLAT Beauty
