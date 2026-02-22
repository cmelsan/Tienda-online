# ÉCLAT Beauty  Plataforma E-Commerce Premium

> Tienda online de cosmética de lujo desarrollada con **Astro 5**, **Supabase** y **Stripe**. Plataforma full-stack de producción con carrito persistente, autenticación, gestión completa de pedidos, sistema de facturación PDF, devoluciones, cupones, flash sales y panel administrativo.

---

## Stack Tecnológico

| Área | Tecnología | Versión |
|---|---|---|
| **Framework** | Astro (híbrido SSG + SSR) | 5.0.3 |
| **Componentes interactivos** | React | 18.3.1 |
| **Estilos** | Tailwind CSS | 3.4.17 |
| **Base de datos** | Supabase (PostgreSQL) |  |
| **Autenticación** | Supabase Auth |  |
| **Estado global** | Nanostores + @nanostores/persistent |  |
| **Pagos** | Stripe (Checkout Sessions + Webhooks) |  |
| **Email transaccional** | Brevo (Sendinblue) |  |
| **Imágenes** | Cloudinary |  |
| **Generación PDF** | PDFKit |  |
| **Gráficas (admin)** | Recharts |  |
| **Despliegue** | Coolify + Docker (Node standalone) |  |
| **Runtime** | Node.js | 20+ |

---

## Características implementadas

### Tienda pública
- Catálogo dinámico con filtros y búsqueda en tiempo real (debounce)
- Páginas de producto con galería, precio, stock y valoraciones
- Categorías jerárquicas (categoría  subcategoría) y catálogo de marcas
- **Flash sales** con temporizador de cuenta atrás
- **Bestsellers** y **Nuevas llegadas**
- **Ofertas** configurables desde el admin
- **Lista de deseos** (wishlist) para usuarios registrados
- **Cupones de descuento** con validación en tiempo real (% o importe fijo, caducidad, uso máximo, importe mínimo)
- Newsletter con pop-up de captación de leads
- Páginas informativas en SSG: FAQ, Contacto, Envíos, Tiendas, Sobre Nosotros
- Diseño responsive premium inspirado en marcas de lujo

### Autenticación de usuarios
- Registro e inicio de sesión con email/contraseña
- Restablecimiento de contraseña por email (token seguro)
- Panel "Mi Cuenta": perfil, pedidos, facturas, lista de deseos, direcciones guardadas
- Soporte a clientes guest (sin registro)

### Carrito y Checkout
- Carrito persistente en localStorage + sincronización a Supabase (Nanostores)
- Fusión de carrito anónimo al hacer login
- Checkout multi-paso: dirección  pago (Stripe Checkout)
- Aplicación de cupón con descuento visible antes del pago
- Confirmación automática de pedido via webhook de Stripe

### Sistema de pedidos y facturación
- Flujo completo: `awaiting_payment`  `paid`  `shipped`  `delivered`
- Confirmación por webhook `checkout.session.completed` (verificado con firma HMAC)
- Reducción de stock atómica mediante RPC Supabase (sin race conditions)
- **Factura PDF** generada automáticamente en cada compra (PDFKit)
- Envío de factura como adjunto en email de confirmación (Brevo)
- Historial de cambios de estado (`order_status_history`)
- Numeración de pedidos correlativa (`ECLAT-YYYY-NNNN`)

### Sistema de devoluciones y abonos
- Solicitud de devolución desde "Mi Cuenta" (por ítem individual)
- Gestión centralizada desde `/admin/devoluciones` (aprobar/rechazar)
- Reembolso Stripe automático (total o parcial)
- **Nota de abono PDF** generada y enviada al cliente
- Restauración de stock atómica al aprobar devolución
- Estados del pedido: `return_requested`  `returned` / `partially_returned`  `refunded` / `partially_refunded`
- Log de reembolsos en `refunds_log`

### Panel administrativo
- **Dashboard** con KPIs en tiempo real: ventas, pedidos, productos, clientes (gráficas Recharts)
- **Gestión de productos**: CRUD completo, subida de imágenes a Cloudinary (drag & drop, upload firmado)
- **Control de stock**: ajuste manual
- **Gestión de pedidos**: cambios de estado, cancelación con reembolso Stripe automático
- **Gestión de devoluciones**: aprobación/rechazo, reembolso parcial o total
- **Facturas**: listado y descarga de facturas y notas de abono en PDF
- **Cupones**: crear, editar, desactivar cupones con todas las restricciones
- **Marcas**: CRUD de marcas con logotipo
- **Flash Sales**: activar/desactivar por producto, descuento y fecha de fin
- **Ofertas**: activar/desactivar globalmente desde configuración
- **Newsletter**: listado de suscriptores exportable
- **Categorías y Subcategorías**: gestión desde panel de atributos

### Seguridad
- Row Level Security (RLS) en todas las tablas de Supabase
- Middleware Astro que verifica sesión + `is_admin` en todas las rutas `/admin/*` y `/api/admin/*`
- RPCs `SECURITY DEFINER`  sin necesidad de exponer `service_role` key al cliente
- Webhook Stripe verificado con `Stripe-Signature` header (previene falsificación)
- Upload de imágenes con firma generada en servidor (Cloudinary)

### Valoraciones
- Los usuarios con compra verificada pueden dejar valoraciones (1-5 estrellas + comentario)
- Media de valoraciones visible en ficha de producto

---

## Arquitectura: SSG + SSR Híbrido

| Páginas | Estrategia | Motivo |
|---|---|---|
| `/faq`, `/contacto`, `/envios`, `/tiendas`, `/sobre-nosotros/*` | **SSG** (`prerender = true`) | Contenido fijo, máxima velocidad y SEO |
| `/`, `/productos/*`, `/categoria/*`, `/marcas`, `/ofertas`, etc. | **SSR** | Datos dinámicos (stock, flash sales, precios) |
| `/carrito`, `/checkout/*`, `/mi-cuenta/*` | **SSR** | Requieren sesión autenticada |
| `/admin/*`, `/api/*` | **SSR** | Lógica de negocio, escrituras en BD |

---

## Requisitos previos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Stripe](https://stripe.com)
- Cuenta en [Brevo](https://brevo.com)
- Cuenta en [Cloudinary](https://cloudinary.com)
- Docker (para deploy en Coolify)

---

## Instalación y desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar y configurar variables de entorno
cp .env.example .env

# 3. Arrancar servidor de desarrollo
npm run dev
#  http://localhost:4321
```

### Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo con hot reload
npm run build    # Build de producción
npm start        # Ejecutar build de producción
```

---

## Variables de entorno

```env
# Supabase
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Brevo (email transaccional)
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=noreply@eclatbeauty.com
BREVO_FROM_NAME=ÉCLAT Beauty

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# App
PUBLIC_SITE_URL=https://eclatbeauty.com
```

---

## Base de datos (Supabase)

### Tablas principales

| Tabla | Descripción |
|---|---|
| `profiles` | Extensión de `auth.users` con campo `is_admin` |
| `products` | Catálogo de productos (precio en céntimos) |
| `categories` | Categorías principales |
| `subcategories` | Subcategorías (FK  categories) |
| `brands` | Marcas de producto |
| `orders` | Pedidos de usuarios y guests |
| `order_items` | Líneas de pedido con estado de devolución por ítem |
| `order_status_history` | Audit trail completo de estados |
| `invoices` | Facturas y notas de abono (self-referencia) |
| `refunds_log` | Log de reembolsos Stripe |
| `carts` | Carritos persistentes (usuario o sesión anónima) |
| `coupons` | Cupones de descuento con restricciones |
| `coupon_usage` | Registro de uso de cupones por pedido |
| `wishlist` | Lista de deseos por usuario |
| `reviews` | Valoraciones de productos |
| `user_addresses` | Direcciones guardadas |
| `newsletter_subscribers` | Suscriptores al newsletter |
| `app_settings` | Configuración global (key-value JSON) |

### Orden de migraciones SQL

Ejecutar en Supabase SQL Editor en este orden:

```
1.  database-schema.sql
2.  migration_offers.sql
3.  migration_flash_sale.sql
4.  migrations_coupons.sql
5.  migration_subcategories.sql
6.  migration_order_numbering.sql
7.  migration_invoices.sql
8.  migration_refunds_log.sql
9.  migration_reviews.sql
10. migration_wishlist.sql
11. migration_newsletter.sql
12. migration_order_status_fix.sql
13. migration_partially_refunded_status.sql
14. migration_return_fields.sql
15. migration_item_returns.sql
16. fix_create_order_awaiting_payment.sql
17. FIX_ORDER_NUMBER_CLEAN.sql
18. add_customer_invoice_rls.sql
19. rpc_admin_post_sale.sql
20. decrease_stock_atomic.sql
21. increment_coupon_usage_atomic.sql
22. delete_pending_order.sql
23. create_reset_password_function.sql
```

---

## Configurar Stripe Webhook

1. Stripe Dashboard  Developers  Webhooks  Add endpoint
2. URL: `https://tudominio.com/api/webhooks/stripe`
3. Evento a escuchar: **`checkout.session.completed`**
4. Copiar "Signing Secret"  variable `STRIPE_WEBHOOK_SECRET`

---

## Despliegue en Coolify (VPS)

1. Crear nuevo proyecto en Coolify y conectar repositorio GitHub
2. Coolify detecta automáticamente el `Dockerfile`
3. Añadir todas las variables de entorno en la configuración de Coolify
4. Deploy  Coolify construye la imagen Docker y la sirve con SSL automático (Let's Encrypt)

```bash
# Build manual (opcional)
docker build -t eclat-beauty .
docker run -p 4321:4321 --env-file .env eclat-beauty
```

---

## Estructura del proyecto

```
src/
 components/
    admin/        # AdminOrderActions, AdminReturnRow, AdminProductForm...
    checkout/     # CheckoutFlow, AddressStep, CheckoutButton
    dashboard/    # Gráficas Recharts (ventas, pedidos, KPIs)
    islands/      # AddToCartButton, CartSlideOver, SearchBar, CountdownTimer
    orders/       # OrderActions, ReturnModal
    product/      # ProductCard, ProductFilters, ProductGallery
    reviews/      # ReviewForm, ReviewList
    ui/           # Button, Card, Input, Modal, Notification...
 layouts/
    PublicLayout.astro
    AdminLayout.astro
 lib/
    supabase.ts       # Cliente Supabase + tipos TypeScript
    brevo.ts          # Emails transaccionales (confirmación, envío, cancelación, abono)
    cloudinary.ts     # Upload firmado y transformación de imágenes
    coupons.ts        # Validación y aplicación de cupones
    dashboard.ts      # Queries SQL para KPIs del dashboard
    invoices.ts       # Generación de PDF con PDFKit (facturas + notas de abono)
    utils.ts          # Utilidades (formateo de precios, fechas, etc.)
 middleware.ts          # Auth guard para /admin/* y /api/admin/*
 pages/
    admin/            # Backoffice (SSR, protegido por middleware)
    api/
       admin/        # Endpoints admin (verifican is_admin)
       stripe/       # Webhook de Stripe
       orders/       # Endpoints de usuario
    checkout/         # Proceso de compra (SSR)
    mi-cuenta/        # Panel del usuario (SSR)
    productos/        # Detalle de producto (SSR, stock en tiempo real)
    categoria/        # Catálogo por categoría (SSR)
    faq.astro         #  SSG (prerender = true)
    contacto.astro    #  SSG
    envios.astro      #  SSG
    tiendas.astro     #  SSG
    sobre-nosotros/   #  SSG (todas las páginas)
 stores/
     cart.ts           # Carrito persistente (Nanostores + localStorage)
     notifications.ts  # Sistema de toast notifications
```

---

## Documentación técnica

Ver [DOCUMENTACION.md](./DOCUMENTACION.md) para:
- **Diagrama Entidad-Relación** completo de las 17 tablas (Mermaid)
- **Justificación del stack** tecnológico (por qué cada tecnología)
- **Flujos de facturación** detallados: compra, cancelación y devolución parcial
- **Arquitectura de seguridad**: RLS, middleware, RPCs, webhooks

---

## Licencia

Proyecto académico  ÉCLAT Beauty  2025
