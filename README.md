# ÉCLAT Beauty E-commerce Platform 💄

Una tienda online premium de belleza y cuidado personal construida con **Astro 5**, **Supabase** y **Stripe**. Plataforma totalmente funcional con carrito persistente, autenticación, gestión de órdenes y panel administrativo.

## 🚀 Stack Tecnológico

| Área | Tecnología |
|------|-----------|
| **Framework** | Astro 5 (SSR + SSG) |
| **Frontend** | React 18 + TypeScript |
| **Estilos** | Tailwind CSS 3 |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Autenticación** | Supabase Auth |
| **Pagos** | Stripe |
| **Estado Global** | Nano Stores |
| **Deployment** | Coolify + Docker |
| **Node.js** | v20+ |

## 📦 Características Implementadas

### 🛍️ Tienda Pública
- ✅ **Catálogo dinámico** - Productos con imágenes, precios y stock
- ✅ **Categorías** - Maquillaje, Cabello, Cuerpo, Perfumes
- ✅ **Filtrado avanzado** - Por categoría, marca, rango de precio
- ✅ **Búsqueda** - Barra de búsqueda en tiempo real
- ✅ **Carrito persistente** - Guardado en localStorage
- ✅ **Checkout integrado** - Con Stripe
- ✅ **Lista de deseos** - Favoritos guardados en BD
- ✅ **Sistema de marcas** - Catálogo de marcas/proveedores
- ✅ **Autenticación de usuarios** - Registro e inicio de sesión
- ✅ **Mi Cuenta** - Panel personal del usuario
- ✅ **Historial de pedidos** - Visualización de compras
- ✅ **Newsletter** - Suscripción a boletín
- ✅ **Ofertas** - Página de ofertas especiales (configurable)

### 👨‍💼 Panel Administrativo (SSR)
- ✅ **Dashboard** - Estadísticas en tiempo real (productos, categorías, pedidos)
- ✅ **Gestión de Productos** - CRUD completo con imágenes
- ✅ **Control de Stock** - Actualizar disponibilidad de productos
- ✅ **Gestión de Categorías** - Crear y editar categorías
- ✅ **Gestión de Subcategorías** - Organización jerárquica
- ✅ **Gestión de Marcas** - Catálogo de proveedores/marcas
- ✅ **Atributos** - Gestionar marcas y subcategorías
- ✅ **Gestión de Pedidos** - Ver y actualizar estado
- ✅ **Gestión de Devoluciones** - Procesar solicitudes de devolución
- ✅ **Configuración Global** - Habilitar/deshabilitar ofertas
- ✅ **Autenticación Admin** - Acceso seguro con Supabase Auth

### 💳 Pagos & Órdenes
- ✅ **Integración Stripe** - Pagos seguros con tarjeta
- ✅ **Webhooks Stripe** - Sincronización de estados de pago
- ✅ **Crear órdenes** - Sistema RPC de Supabase
- ✅ **Seguimiento de pedidos** - Estado en tiempo real
- ✅ **Gestión de devoluciones** - Solicitudes y procesamiento

### 📱 Experiencia de Usuario
- ✅ **Diseño responsive** - Mobile-first, totalmente adaptable
- ✅ **Diseño premium** - Inspirado en marcas de lujo (MAC, NARS)
- ✅ **Animaciones suaves** - Transiciones elegantes
- ✅ **Performance optimizado** - SSG + SSR + optimización de imágenes
- ✅ **SEO optimizado** - Meta tags, Open Graph, Schema.org

## 🔧 Configuración Inicial

### Requisitos Previos
- Node.js 20+
- npm o yarn
- Cuenta en Supabase
- Cuenta en Stripe
- Docker (para Coolify)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/cmelsan/Tienda-online.git
cd Tienda-online

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Editar .env con tus credenciales:
# - PUBLIC_SUPABASE_URL
# - PUBLIC_SUPABASE_ANON_KEY
# - STRIPE_PUBLISHABLE_KEY
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
```

### Desarrollo Local

```bash
npm run dev      # Inicia servidor en http://localhost:4321
npm run build    # Compilar para producción
npm start        # Ejecutar versión de producción
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── admin/                    # Componentes del admin
│   │   ├── AdminOrderRow.tsx
│   │   └── AdminReturnRow.tsx
│   ├── checkout/                 # Flujo de checkout
│   │   ├── AddressStep.tsx
│   │   ├── CheckoutButton.tsx
│   │   └── CheckoutFlow.tsx
│   ├── islands/                  # Componentes React interactivos
│   │   ├── AddToCartButton.tsx
│   │   ├── CartSlideOver.tsx
│   │   └── SearchBar.tsx
│   ├── orders/                   # Gestión de pedidos
│   │   ├── OrderActions.tsx
│   │   └── ReturnModal.tsx
│   ├── product/                  # Componentes de productos
│   │   ├── ProductCard.astro
│   │   ├── ProductFilters.tsx
│   │   └── ProductGallery.astro
│   └── ui/                       # Componentes reutilizables
│       ├── Button.astro
│       ├── Card.astro
│       └── Input.astro
├── layouts/
│   ├── AdminLayout.astro         # Layout del panel admin
│   ├── BaseLayout.astro          # Layout base
│   └── PublicLayout.astro        # Layout de tienda pública
├── lib/
│   ├── auth-sync.ts              # Sincronización de autenticación
│   ├── sessionManager.ts         # Gestión de sesiones
│   ├── supabase.ts               # Cliente Supabase + tipos
│   └── utils.ts                  # Utilidades (formateo, etc.)
├── pages/
│   ├── admin/                    # Rutas del admin
│   │   ├── index.astro          # Dashboard
│   │   ├── atributos.astro      # Gestión de atributos
│   │   ├── configuracion.astro  # Configuración global
│   │   ├── devoluciones.astro   # Gestión de devoluciones
│   │   ├── marcas/              # CRUD de marcas
│   │   ├── pedidos/             # Gestión de pedidos
│   │   └── productos/           # CRUD de productos
│   ├── api/                      # Rutas API
│   │   ├── newsletter.ts
│   │   ├── wishlist.ts
│   │   ├── create-checkout-session.ts
│   │   └── webhooks/stripe.ts
│   ├── categoria/                # Catálogo por categoría
│   ├── checkout/                 # Proceso de checkout
│   ├── marcas/                   # Catálogo de marcas
│   ├── mi-cuenta/                # Panel de usuario
│   ├── productos/                # Catálogo principal
│   ├── index.astro              # Homepage
│   ├── login.astro              # Login de usuarios
│   ├── ofertas.astro            # Página de ofertas
│   └── registro.astro           # Registro de usuarios
├── stores/
│   └── cart.ts                   # Estado global del carrito (Nano Stores)
├── middleware.ts                 # Middleware de autenticación
└── env.d.ts                      # Tipos de entorno

public/
├── assets/
│   └── products/                 # Imágenes de productos

database-schema.sql              # Schema de la BD
Dockerfile                       # Configuración de Docker
.dockerignore                    # Archivos ignorados en Docker
astro.config.mjs                 # Configuración de Astro
tailwind.config.mjs              # Configuración de Tailwind
tsconfig.json                    # Configuración de TypeScript
```

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

| Tabla | Propósito |
|-------|-----------|
| **products** | Catálogo de productos |
| **categories** | Categorías principales |
| **subcategories** | Subcategorías de productos |
| **brands** | Marcas/Proveedores |
| **orders** | Pedidos de clientes |
| **order_items** | Items de cada pedido |
| **carts** | Carritos guardados |
| **wishlist** | Lista de deseos de usuarios |
| **newsletter_subscribers** | Suscriptores a newsletter |
| **settings** | Configuración global (ofertas, etc) |
| **profiles** | Perfiles de usuarios (extensión Auth) |

## 🔐 Autenticación & Seguridad

- ✅ **Supabase Auth** - Autenticación segura con correo/contraseña
- ✅ **Middleware** - Protección de rutas administrativas
- ✅ **Row Level Security (RLS)** - Seguridad a nivel de BD
- ✅ **Sesiones** - Gestión de sesiones de usuario
- ✅ **JWT** - Tokens seguros

### Acceder al Admin
1. Ir a `/admin/login`
2. Usar credenciales de Supabase Auth
3. Solo usuarios autenticados pueden acceder

## 💳 Pagos con Stripe

- ✅ **Checkout seguro** - Integración de Stripe Checkout
- ✅ **Webhooks** - Sincronización de eventos de pago
- ✅ **Estados de pedido** - Actualización automática
- ✅ **Devoluciones** - Gestión de reembolsos

### Configurar Webhook de Stripe
1. Ir a Stripe Dashboard → Developers → Webhooks
2. Agregar endpoint: `https://tudominio.com/api/webhooks/stripe`
3. Seleccionar eventos: `payment_intent.succeeded`, `charge.refunded`
4. Copiar "Signing Secret" → Variable `STRIPE_WEBHOOK_SECRET`

## 🚀 Deployment en Coolify

El proyecto incluye `Dockerfile` optimizado para Coolify:

```dockerfile
# Build multi-stage
# Compilation + Production image
```

**Pasos de deployment:**
1. Conectar repositorio GitHub a Coolify
2. Configurar variables de entorno en Coolify
3. Coolify automáticamente construye la imagen Docker
4. Deploy en tu dominio personalizado

## 📊 Estadísticas del Proyecto

- **+40 archivos** de componentes y páginas
- **+15 rutas API** funcionales
- **+10 tablas** de base de datos
- **+50 funciones** de utilidad
- **Totalmente responsive** mobile, tablet, desktop
- **Performance A+** en Lighthouse

---

## 🔮 Características Sugeridas para Implementar

### 🎯 Prioritarias (Alto Impacto)

1. **💳 Métodos de Pago Alternativos**
   - PayPal
   - Apple Pay / Google Pay
   - Transferencia bancaria
   - Pago contra reembolso

2. **📸 Sistema de Reseñas & Ratings**
   - Calificación de productos (1-5 estrellas)
   - Comentarios de clientes
   - Verificación de compra
   - Fotos de usuario en producto

3. **🎁 Programa de Lealtad**
   - Puntos por compra
   - Descuentos acumulativos
   - Programa VIP/Membresía
   - Referral program

4. **📧 Sistema de Notificaciones**
   - Emails transaccionales (confirmación orden, envío)
   - Alertas de stock bajo
   - Promociones personalizadas
   - SMS (opcional)

5. **🔔 Notificaciones en Tiempo Real**
   - WebSockets para chat
   - Notificaciones de stock
   - Alertas de cambios en ordenes

### 🎨 Mejoras UX/UI (Medio Impacto)

6. **🎨 Tema Oscuro/Claro**
   - Toggle de tema
   - Persistencia en localStorage
   - Respeto a preferencia del sistema

7. **🏆 Comparador de Productos**
   - Comparar hasta 3-4 productos
   - Tabla de características
   - Diferencias de precio

8. **🔍 Búsqueda Avanzada**
   - Búsqueda por voz
   - Autocomplete mejorado
   - Filtros guardados
   - Búsqueda visual (por imagen)

9. **🎯 Recomendaciones Personalizadas**
   - "Productos que otros compraron"
   - "Vistos recientemente"
   - "También te puede gustar"
   - Algoritmo de IA

10. **📱 Progressive Web App (PWA)**
    - Instalable en móvil
    - Funcionamiento offline
    - Push notifications

### 🔧 Funcionalidad (Medio-Bajo Impacto)

11. **📦 Integración de Logística**
    - Cálculo de envíos en tiempo real
    - Integración con correos (DHL, Correos, etc.)
    - Tracking de paquetes
    - Múltiples opciones de envío

12. **🌍 Multiidioma & Multimoneda**
    - i18n (español, inglés, francés)
    - Conversión de moneda
    - Impuestos locales

13. **📊 Analytics & Dashboard Avanzado**
    - Google Analytics integrado
    - Heatmaps de usuario
    - Conversión y abandonos
    - Productos más vendidos
    - ROI de campañas

14. **🔐 Gestión de Cupones/Códigos Promocionales**
    - Cupones con descuento
    - Código de referral
    - Restricciones (categoría, cantidad min, vigencia)
    - Uso ilimitado o limitado

15. **👥 Gestión de Usuarios Mejorada**
    - Múltiples direcciones de envío
    - Métodos de pago guardados
    - Historial de compras
    - Centro de atención al cliente

### 🤖 Innovación (Bajo Impacto/Futuro)

16. **🤖 Chatbot IA**
    - Soporte 24/7 con IA
    - Respuestas inteligentes
    - Escalamiento a humanos

17. **🧠 Motor de Recomendación con IA**
    - Machine Learning
    - Predicción de preferencias
    - Personalización profunda

18. **📸 Búsqueda por Imagen**
    - Upload de foto
    - Encuentra productos similares
    - Reconocimiento visual

19. **🎥 Video Showcase**
    - Videos de tutoriales de productos
    - Demostración de aplicación
    - Reseñas en video

20. **🌐 Social Commerce**
    - Integración con Instagram/TikTok
    - Compra desde redes sociales
    - User-generated content

---

## 🛠️ Stack Recomendado para Nuevas Features

- **Emails**: SendGrid o Resend
- **IA**: OpenAI GPT, Hugging Face
- **Analytics**: Mixpanel, Segment
- **Video**: Cloudinary, Mux
- **Búsqueda**: Algolia
- **CDN**: Cloudflare

## 👨‍💻 Contribuir

Las contribuciones son bienvenidas. Para cambios mayores, abre un issue primero.

## 📄 Licencia

Proyecto académico - ÉCLAT Beauty © 2026
