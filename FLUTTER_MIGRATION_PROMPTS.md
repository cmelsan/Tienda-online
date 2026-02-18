# 📱 GUÍA COMPLETA DE MIGRACIÓN A FLUTTER - ÉCLAT BEAUTY

## 📋 ÍNDICE DE PROMPTS

Este documento contiene **13 prompts especializados** para migrar completamente el proyecto ÉCLAT Beauty de Astro a Flutter.

### Estructura de Prompts:
1. [Configuración Inicial](#prompt-1-configuración-inicial)
2. [Arquitectura y Estructura del Proyecto](#prompt-2-arquitectura-y-estructura)
3. [Base de Datos y Backend Supabase](#prompt-3-base-de-datos-y-backend)
4. [Autenticación y Autorización](#prompt-4-autenticación-y-autorización)
5. [Catálogo de Productos y Filtrado](#prompt-5-catálogo-de-productos)
6. [Sistema de Carrito de Compras](#prompt-6-carrito-de-compras)
7. [Sistema de Checkout y Pagos Stripe](#prompt-7-checkout-y-pagos)
8. [Panel Administrativo Completo](#prompt-8-panel-administrativo)
9. [Sistema de Cupones de Descuento](#prompt-9-sistema-de-cupones)
10. [Flash Sales y Ofertas](#prompt-10-flash-sales)
11. [Sistema de Reviews y Ratings](#prompt-11-reviews-y-ratings)
12. [Sistema Post-Venta y Devoluciones](#prompt-12-sistema-post-venta)
13. [Integraciones Externas](#prompt-13-integraciones-externas)

---

## 🎯 INSTRUCCIÓN PARA EL USUARIO

**ANTES DE USAR LOS PROMPTS:**

1. Crea una carpeta llamada `ÉCLAT-MIGRATION` con dos subcarpetas:
   ```
   ÉCLAT-MIGRATION/
   ├── astro-original/     (copia el proyecto Astro aquí)
   └── flutter-app/        (aquí se creará el proyecto Flutter)
   ```

2. Abre esta carpeta en el editor que uses (VS Code recomendado)

3. Usa los prompts EN ORDEN (1 al 13) porque cada uno construye sobre el anterior

4. Cada prompt incluye:
   - ✅ Qué archivos revisar del proyecto Astro
   - ✅ Qué implementar en Flutter
   - ✅ Packages necesarios
   - ✅ Código de ejemplo

---

# PROMPTS PARA FLUTTER MIGRATION

---

## PROMPT 1: Configuración Inicial

```
Soy el propietario de ÉCLAT Beauty, una tienda e-commerce completa construida con Astro + Supabase + Stripe. Quiero migrar TODO el proyecto a Flutter.

CONTEXTO DEL PROYECTO ORIGINAL:
- **Stack actual**: Astro 5, React 18, TypeScript, Supabase (PostgreSQL), Stripe, Tailwind CSS
- **Base de datos**: Supabase PostgreSQL con 12+ tablas (products, categories, brands, orders, order_items, coupons, reviews, wishlist, flash_sales, returns, newsletter, settings)
- **Autenticación**: Supabase Auth con roles (admin/user)
- **Pagos**: Stripe Checkout + Webhooks
- **Estado**: Nano Stores (carrito persistente en localStorage)
- **Emails**: Brevo API
- **Imágenes**: Cloudinary

REVISA los siguientes archivos del proyecto Astro:
1. `astro-original/README.md` - Para entender todas las features
2. `astro-original/database-schema.sql` - Schema completo de la BD
3. `astro-original/package.json` - Dependencias actuales
4. `astro-original/SETUP.md` - Configuración inicial

TAREAS A REALIZAR:

1. **Crear proyecto Flutter nuevo** con arquitectura limpia y escalable
   - Usar Flutter 3.x con null safety
   - Configurar para Android + iOS + Web

2. **Listar TODOS los packages de Flutter necesarios** para:
   - Supabase (supabase_flutter)
   - Estado (provider o riverpod - recomienda cuál)
   - Persistencia local (shared_preferences, hive)
   - HTTP y API calls
   - Pagos Stripe (flutter_stripe)
   - Imágenes (cached_network_image)
   - Forms y validación
   - Navegación
   - UI/UX (cualquier package útil)

3. **Crear estructura de carpetas** siguiendo clean architecture:
   ```
   lib/
   ├── core/
   │   ├── constants/
   │   ├── theme/
   │   ├── utils/
   │   └── errors/
   ├── data/
   │   ├── models/
   │   ├── repositories/
   │   └── datasources/
   ├── domain/
   │   ├── entities/
   │   └── repositories/
   ├── presentation/
   │   ├── screens/
   │   ├── widgets/
   │   └── providers/
   └── main.dart
   ```

4. **Configurar variables de entorno** (.env) para:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - STRIPE_PUBLISHABLE_KEY
   - BREVO_API_KEY
   - CLOUDINARY_CLOUD_NAME

5. **Crear archivo de configuración de theme** que replique el diseño premium del proyecto Astro:
   - Paleta de colores rosa/dorado elegante
   - Tipografías limpias
   - Bordes redondeados
   - Sombras sutiles

ENTREGABLES:
- pubspec.yaml completo con TODOS los packages
- Estructura de carpetas creada
- main.dart con configuración inicial
- theme.dart con diseño premium
- .env.example con variables necesarias
- constants.dart con configuraciones globales

NO empieces a implementar lógica de negocio todavía. Solo prepara la estructura.
```

---

## PROMPT 2: Arquitectura y Estructura

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA los siguientes archivos del proyecto Astro:
1. `astro-original/src/lib/supabase.ts` - Cliente Supabase y tipos TypeScript
2. `astro-original/src/lib/utils.ts` - Funciones utilitarias
3. `astro-original/src/middleware.ts` - Middleware de autenticación

TAREAS A REALIZAR:

1. **Crear modelos de datos (Data Models)** en `lib/data/models/`:
   Basándote en el schema SQL, crea modelos Dart para:
   - Product (con fromJson, toJson, copyWith)
   - Category
   - Brand
   - Order
   - OrderItem
   - CartItem
   - Coupon
   - Review
   - Wishlist
   - FlashSale
   - User/Profile
   
   Ejemplo de estructura para Product:
   ```dart
   class ProductModel {
     final String id;
     final String name;
     final String slug;
     final String description;
     final int price; // en centavos
     final int stock;
     final String categoryId;
     final List<String> images;
     final String? brandId;
     final bool isFlashSale;
     final double? flashSaleDiscount;
     final DateTime? flashSaleEndTime;
     
     // Constructor, fromJson, toJson, copyWith
   }
   ```

2. **Crear Repository Interfaces** en `lib/domain/repositories/`:
   - ProductRepository (abstract class con métodos)
   - OrderRepository
   - AuthRepository
   - CartRepository
   - etc.

3. **Implementar Repositories** en `lib/data/repositories/`:
   - Conectar con Supabase
   - Manejar errores
   - Transformar datos de la API a modelos

4. **Crear clase SupabaseService** en `lib/core/services/`:
   - Singleton para cliente Supabase
   - Métodos helper para queries comunes
   - Manejo de sesiones

5. **Crear Utils y Helpers**:
   - `format_currency.dart` - Formatear precios (centavos a euros)
   - `validators.dart` - Validación de forms
   - `date_formatter.dart` - Formatear fechas
   - `error_handler.dart` - Manejo centralizado de errores

6. **Crear Constants**:
   - `app_constants.dart` - Valores constantes
   - `api_constants.dart` - Endpoints y keys de API
   - `app_strings.dart` - Textos de la app (i18n futuro)

ENTREGABLES:
- Todos los modelos de datos creados con serialización JSON
- Interfaces de repositorios definidas
- Implementación de repositorios con Supabase
- SupabaseService funcional
- Utils y helpers listos
- Constants organizados

NOTA: Asegúrate de que TODOS los modelos tengan:
- Constructores nombrados (.fromJson)
- Métodos toJson() para serialización
- copyWith() para inmutabilidad
- toString() para debugging
```

---

## PROMPT 3: Base de Datos y Backend

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos SQL del proyecto Astro:
1. `astro-original/database-schema.sql` - Schema completo (TODO el archivo, tiene 1120 líneas)
2. `astro-original/migrations_coupons.sql` - Sistema de cupones
3. `astro-original/migration_flash_sale.sql` - Flash sales
4. `astro-original/migration_reviews.sql` - Reviews
5. `astro-original/migration_item_returns.sql` - Sistema de devoluciones

INFORMACIÓN IMPORTANTE:
El proyecto usa FUNCIONES RPC (Remote Procedure Calls) de PostgreSQL para lógica crítica:
- `create_order()` - Crear orden atómicamente con validación de stock
- `cancel_order()` - Cancelar orden y restaurar stock
- `request_return()` - Solicitar devolución (30 días desde entrega)
- `process_return()` - Aprobar/rechazar devolución (admin)
- `process_refund()` - Procesar reembolso (admin)
- `update_order_status()` - Actualizar estado de orden
- `increment_coupon_usage_atomic()` - Incrementar uso de cupón atómicamente
- `validate_coupon()` - Validar cupón (existe en algunos esquemas)

TAREAS A REALIZAR:

1. **Ejecutar el schema SQL en Supabase**:
   - Crea un proyecto nuevo en Supabase (o usa el existente)
   - Ejecuta `database-schema.sql` completo
   - Ejecuta todas las migraciones (coupons, flash_sale, reviews, returns)
   - Verifica que todas las tablas, funciones RPC y políticas RLS existan

2. **Crear DataSources para cada tabla** en `lib/data/datasources/`:
   
   Ejemplo para `products_datasource.dart`:
   ```dart
   class ProductsDataSource {
     final SupabaseClient _supabase;
     
     Future<List<ProductModel>> fetchProducts({
       String? categoryId,
       String? brandId,
       int? minPrice,
       int? maxPrice,
       bool? isFlashSale,
     }) async {
       // Query con filtros
     }
     
     Future<ProductModel> fetchProductBySlug(String slug) async {
       // Fetch individual
     }
     
     // Más métodos...
   }
   ```

3. **Implementar llamadas a funciones RPC**:
   
   Crear `lib/data/datasources/rpc_datasource.dart`:
   ```dart
   class RPCDataSource {
     final SupabaseClient _supabase;
     
     Future<Map<String, dynamic>> createOrder({
       required List<Map<String, dynamic>> items,
       required int totalAmount,
       required Map<String, dynamic> shippingAddress,
       String? guestEmail,
       String? customerName,
       String? couponId,
     }) async {
       final response = await _supabase.rpc('create_order', params: {
         'p_items': items,
         'p_total_amount': totalAmount,
         'p_shipping_address': shippingAddress,
         'p_guest_email': guestEmail,
         'p_customer_name': customerName,
       });
       return response;
     }
     
     // Implementar: cancel_order, request_return, process_return, etc.
   }
   ```

4. **Configurar Row Level Security (RLS)**:
   - Documentar las políticas RLS existentes
   - Asegurarte de que Flutter respeta las políticas
   - Crear helpers para verificar permisos en UI

5. **Crear servicio de sincronización**:
   - Sincronizar carrito local con backend (tabla `carts`)
   - Migrar carrito de guest a usuario autenticado
   - Implementar `migrate_guest_cart_to_user()` RPC

6. **Test de conexión**:
   - Crear script de prueba para cada datasource
   - Verificar que todas las queries funcionen
   - Probar las funciones RPC

ENTREGABLES:
- DataSources creados para todas las tablas
- RPCDataSource con todas las funciones
- Documentación de políticas RLS
- Servicio de sincronización implementado
- Tests básicos de conexión

IMPORTANTE: 
- Todos los precios están en CENTAVOS (4500 = 45.00€)
- Las funciones RPC son CRÍTICAS para la integridad de datos
- No hagas updates directos a stock, usa las funciones RPC
```

---

## PROMPT 4: Autenticación y Autorización

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/src/middleware.ts` - Middleware de autenticación
2. `astro-original/src/lib/auth-sync.ts` - Sincronización de auth
3. `astro-original/src/pages/login.astro` - Login de usuarios
4. `astro-original/src/pages/registro.astro` - Registro
5. `astro-original/src/pages/admin/login.astro` - Login de admin
6. `astro-original/src/pages/recuperar-contrasena.astro` - Recuperar contraseña
7. `astro-original/password_reset_migration_v2.sql` - Sistema de reset de contraseña

INFORMACIÓN DEL SISTEMA DE AUTH:
- Supabase Auth con email/contraseña
- Roles: 'admin' y 'user' (en tabla `profiles`)
- Middleware protege rutas de admin
- Guest checkout permitido (sin cuenta)
- Migración de carrito guest → usuario registrado al hacer login

TAREAS A REALIZAR:

1. **Crear AuthRepository** completo:
   ```dart
   abstract class AuthRepository {
     Stream<User?> get authStateChanges;
     Future<User?> getCurrentUser();
     Future<void> signInWithEmail(String email, String password);
     Future<void> signUpWithEmail(String email, String password);
     Future<void> signOut();
     Future<void> resetPassword(String email);
     Future<bool> isAdmin();
   }
   ```

2. **Implementar AuthRepositoryImpl**:
   - Usar Supabase Auth
   - Crear perfil automáticamente en tabla `profiles` al registrarse
   - Verificar rol de admin consultando `profiles.is_admin`
   - Manejar errores (credenciales incorrectas, email ya existe, etc.)

3. **Crear AuthProvider con Riverpod/Provider**:
   - Estado de autenticación reactivo
   - Usuario actual
   - Loading states
   - Error handling

4. **Implementar pantallas de autenticación**:
   
   **LoginScreen** (`lib/presentation/screens/auth/login_screen.dart`):
   - Form con email y contraseña
   - Validación de campos
   - Botón de "Olvidé mi contraseña"
   - Link a registro
   - Loading indicator durante login
   - Navegación automática después del login
   
   **RegisterScreen**:
   - Form con email, contraseña, confirmar contraseña
   - Validación (email válido, contraseña >= 6 chars)
   - Crear perfil en `profiles` automáticamente
   - Auto-login después de registro
   
   **ForgotPasswordScreen**:
   - Input de email
   - Enviar email de recuperación (Supabase Auth)
   - Mensaje de confirmación
   
   **AdminLoginScreen** (separada):
   - Login normal
   - Después del login, verificar `is_admin = true` en tabla `profiles`
   - Si no es admin, mostrar error y hacer logout
   - Redirigir a admin dashboard si es admin

5. **Implementar Guards de navegación**:
   - AuthGuard: Redirige a login si no autenticado
   - AdminGuard: Verifica que usuario sea admin
   - GuestGuard: Permite acceso solo a guests (para checkout)

6. **Migración de carrito guest a usuario**:
   - Al hacer login exitoso, llamar RPC `migrate_guest_cart_to_user()`
   - Pasar sessionId guest y userId nuevo
   - Actualizar UI del carrito

7. **Widget de User Menu**:
   - Dropdown con avatar
   - Opciones: Mi Cuenta, Pedidos, Wishlist, Cerrar Sesión
   - Mostrar "Admin" si es admin con link a panel

ENTREGABLES:
- AuthRepository completo
- AuthProvider/StateNotifier
- Todas las pantallas de auth implementadas
- Guards de navegación configurados
- Migración de carrito funcionando
- User menu widget

IMPORTANTE:
- La tabla `profiles` tiene trigger automático que crea registro al crear usuario en `auth.users`
- El campo `is_admin` en `profiles` determina si es admin (no hay roles en JWT por defecto)
- Los admins pueden acceder a endpoints `/admin/*`
```

---

## PROMPT 5: Catálogo de Productos

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/src/pages/productos/index.astro` - Catálogo principal
2. `astro-original/src/pages/productos/[slug].astro` - Detalle de producto
3. `astro-original/src/pages/categoria/[slug].astro` - Productos por categoría
4. `astro-original/src/components/product/ProductCard.astro` - Card de producto
5. `astro-original/src/components/product/ProductFilters.tsx` - Filtros
6. `astro-original/src/components/product/ProductGallery.astro` - Galería
7. `astro-original/src/components/islands/SearchBar.tsx` - Buscador

CARACTERÍSTICAS DEL CATÁLOGO:
- Grid responsive de productos
- Filtros: categoría, marca, rango de precio
- Búsqueda en tiempo real (por nombre)
- Paginación/Scroll infinito
- Cards muestran: imagen, nombre, precio, marca, rating (estrellas)
- Detalle muestra: galería de imágenes, descripción, precio, stock, botón añadir al carrito
- Badge "FLASH SALE" si producto está en oferta flash
- Precio original tachado si hay descuento

TAREAS A REALIZAR:

1. **Crear ProductsProvider** (estados):
   ```dart
   class ProductsProvider extends StateNotifier<ProductsState> {
     - List<Product> products
     - List<Product> filteredProducts
     - String? selectedCategory
     - String? selectedBrand
     - RangeValues? priceRange
     - String searchQuery
     - bool isLoading
     - String? error
     
     // Métodos:
     - fetchProducts()
     - filterByCategory(categoryId)
     - filterByBrand(brandId)
     - filterByPriceRange(min, max)
     - searchProducts(query)
     - clearFilters()
   }
   ```

2. **Implementar pantallas**:

   **ProductsListScreen** (`lib/presentation/screens/products/products_list_screen.dart`):
   - AppBar con buscador
   - Drawer/Modal con filtros
   - Grid de ProductCards (2 columnas en móvil, 4 en tablet)
   - Scroll infinito o paginación
   - Pull to refresh
   - Estado de loading con skeletons
   - Estado vacío ("No hay productos")
   
   **ProductDetailScreen**:
   - Image Gallery (PageView con indicadores)
   - Nombre y marca
   - Rating de estrellas (promedio de reviews)
   - Precio (con descuento si aplica)
   - Stock disponible
   - Descripción expandible
   - Selector de cantidad
   - Botón grande "Añadir al Carrito"
   - Sección de productos relacionados (misma categoría)
   - Sección de reviews (ver Prompt 11)
   - Botón de wishlist (corazón)
   
   **CategoryScreen**:
   - Similar a ProductsListScreen pero filtrado por categoría
   - Imagen de banner de categoría
   - Breadcrumbs de navegación

3. **Crear widgets reutilizables**:

   **ProductCard**:
   - Imagen con cached_network_image
   - Badge "FLASH SALE" si `isFlashSale == true`
   - Badge de descuento (-20%)
   - Nombre del producto (máx 2 líneas, ellipsis)
   - Marca (gris, pequeño)
   - Rating (estrellas + número de reviews)
   - Precio (tachado si hay descuento + nuevo precio)
   - Botón de quick add al carrito
   - Animación al tap
   - Hero animation para imagen (al navegar a detalle)
   
   **ProductFiltersWidget**:
   - Lista de categorías (chips seleccionables)
   - Lista de marcas (checkbox o chips)
   - Slider de rango de precio (RangeSlider)
   - Botón "Aplicar Filtros"
   - Botón "Limpiar Filtros"
   
   **SearchBar**:
   - TextField en AppBar
   - Debounce de 300ms para evitar muchas queries
   - Autocomplete con sugerencias
   - Icono de limpiar búsqueda

4. **Implementar búsqueda**:
   - Query en Supabase con `.ilike('%$query%')` en campo `name`
   - También buscar en `description` (opcional)
   - Mostrar resultados en tiempo real

5. **Optimizaciones**:
   - Caché de imágenes (cached_network_image)
   - Caché de productos en memoria (con tiempo de expiración)
   - Lazy loading de imágenes
   - Placeholders mientras carga

ENTREGABLES:
- ProductsProvider implementado
- ProductsListScreen completa
- ProductDetailScreen completa
- CategoryScreen
- ProductCard widget
- ProductFilters widget
- SearchBar funcional
- Navegación entre pantallas configurada

IMPORTANTE:
- Los precios vienen en centavos, debes formatearlos a euros (ej: 4500 → "45,00 €")
- El campo `images` es un array de URLs
- Calcular precio con descuento si `isFlashSale == true`: `price * (1 - flashSaleDiscount / 100)`
- Mostrar "Agotado" si `stock == 0`
```

---

## PROMPT 6: Carrito de Compras

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/src/stores/cart.ts` - Store de carrito (Nano Stores)
2. `astro-original/src/components/islands/CartSlideOver.tsx` - Slide over del carrito
3. `astro-original/src/pages/carrito.astro` - Página de carrito
4. `astro-original/src/components/islands/AddToCartButton.tsx` - Botón añadir

CARACTERÍSTICAS DEL CARRITO:
- Persistente en localStorage (Astro) → en Flutter usar Hive/SharedPreferences
- Sincronización con backend (tabla `carts`)
- Slide-over lateral que se abre al añadir producto
- Página completa de carrito para checkout
- Contador de items en badge del icono
- Modificar cantidad (+ / -)
- Eliminar productos
- Mostrar subtotal y total
- Aplicar cupón de descuento
- Validación de stock antes de añadir

TAREAS A REALIZAR:

1. **Crear CartProvider con estado persistente**:
   ```dart
   class CartProvider extends ChangeNotifier {
     List<CartItem> _items = [];
     Coupon? _appliedCoupon;
     
     // Getters
     List<CartItem> get items => _items;
     int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
     int get subtotal => _items.fold(0, (sum, item) => sum + (item.product.price * item.quantity));
     int get discountAmount => _calculateDiscount();
     int get total => subtotal - discountAmount;
     
     // Métodos
     Future<void> addToCart(Product product, int quantity);
     Future<void> updateQuantity(String productId, int newQuantity);
     Future<void> removeFromCart(String productId);
     Future<void> clearCart();
     Future<void> applyCoupon(String code);
     void removeCoupon();
     Future<void> syncWithBackend();
     Future<void> loadFromLocal();
     Future<void> saveToLocal();
   }
   ```

2. **Implementar persistencia local**:
   - Usar `hive` o `shared_preferences` para guardar cart
   - Cargar carrito al iniciar app
   - Guardar cada vez que se modifica
   - Formato: JSON array de CartItems

3. **Sincronización con backend**:
   - Crear/actualizar registro en tabla `carts` cada vez que cambia
   - Si usuario está autenticado: `user_id`
   - Si es guest: `session_id` (generar UUID único)
   - Al hacer login: llamar RPC `migrate_guest_cart_to_user()`

4. **Implementar AddToCartButton**:
   ```dart
   class AddToCartButton extends StatefulWidget {
     final Product product;
     final int quantity;
     
     - Validar stock disponible antes de añadir
     - Mostrar SnackBar "Producto añadido al carrito" con opción "Ver carrito"
     - Animación de éxito (check icon)
     - Deshabilitar si stock == 0
     - Mostrar loading durante la acción
   }
   ```

5. **Crear CartSlideOver/BottomSheet**:
   - Mostrar automáticamente al añadir producto
   - Lista de productos en carrito (scrollable)
   - Cada item muestra: imagen pequeña, nombre, precio, cantidad (+ / -)
   - Botón para eliminar item
   - Subtotal al final
   - Botón grande "Ir al Carrito" o "Finalizar Compra"
   - Botón "Seguir Comprando" (cierra el sheet)

6. **Crear CartScreen completa**:
   - AppBar con título "Mi Carrito" y badge de cantidad
   - Lista de items (más detallada que el sheet):
     * Imagen del producto (clickable → ir a detalle)
     * Nombre y marca
     * Precio unitario
     * Selector de cantidad (InputNumber o +/-)
     * Precio total del item (unitario × cantidad)
     * Botón eliminar (icono de basura)
   - Sección de cupón:
     * TextField para código
     * Botón "Aplicar"
     * Mostrar cupón aplicado con opción de remover
     * Mostrar mensaje de error si cupón no válido
   - Resumen de precios:
     * Subtotal
     * Descuento (si hay cupón): -X€
     * Total
   - Botón grande "Continuar al Pago" (si hay items)
   - Estado vacío: "Tu carrito está vacío" con botón "Ver Productos"

7. **Validaciones de stock**:
   - Al añadir producto: verificar que `quantity <= stock`
   - Al aumentar cantidad: validar stock
   - Si producto se queda sin stock: mostrar alerta
   - Actualizar stock disponible desde backend antes de checkout

8. **Animaciones y UX**:
   - Animación de añadir al carrito (icono flotante que vuela al carrito)
   - Haptic feedback al añadir
   - Swipe to delete en items del carrito
   - Loading skeletons al cargar carrito

ENTREGABLES:
- CartProvider completo con persistencia
- AddToCartButton funcional
- CartSlideOver/BottomSheet
- CartScreen completa
- Sincronización con backend funcionando
- Validaciones de stock implementadas

IMPORTANTE:
- El carrito NO debe permitir cantidad mayor al stock
- Los precios mostrados deben incluir descuentos flash sale si aplica
- Al aplicar cupón, validar con endpoint `/api/checkout/validate-coupon` (ver Prompt 9)
- El cupón NO se guarda en persistencia local (solo en sesión)
```

---

## PROMPT 7: Checkout y Pagos

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/src/components/checkout/CheckoutFlow.tsx` - Flujo completo
2. `astro-original/src/components/checkout/AddressStep.tsx` - Paso de dirección
3. `astro-original/src/pages/api/create-checkout-session.ts` - Crear sesión Stripe
4. `astro-original/src/pages/api/orders/create.ts` - Crear orden
5. `astro-original/src/pages/api/webhooks/stripe.ts` - Webhook de Stripe
6. `astro-original/src/pages/checkout/success.astro` - Página de éxito
7. `astro-original/src/pages/checkout/cancel.astro` - Pago cancelado

FLUJO DE CHECKOUT:
1. Usuario en CartScreen → click "Continuar al Pago"
2. CheckoutScreen con tabs/steps:
   - Step 1: Dirección de envío
   - Step 2: Resumen y pago
3. Click "Pagar con Stripe" → crear Stripe Checkout Session
4. Redirigir a Stripe Hosted Checkout
5. Usuario paga
6. Stripe webhook notifica al backend
7. Backend crea orden en BD usando RPC `create_order()`
8. Redirige a success page
9. Success page llama a crear orden si no se creó en webhook

TAREAS A REALIZAR:

1. **Crear CheckoutScreen con steps**:
   ```dart
   class CheckoutScreen extends StatefulWidget {
     int _currentStep = 0;
     
     Steps:
     0. Dirección de envío
     1. Resumen y pago
   }
   ```

2. **AddressStep - Formulario de dirección**:
   - Campos:
     * Nombre completo (required)
     * Dirección línea 1 (required)
     * Dirección línea 2 (optional)
     * Ciudad (required)
     * Código postal (required)
     * País (dropdown, default: España)
     * Teléfono (required)
   - Validación de todos los campos requeridos
   - Si usuario autenticado: cargar dirección guardada de `user_addresses`
   - Checkbox "Guardar como dirección predeterminada" (si autenticado)
   - Botón "Continuar a Resumen"

3. **SummaryStep - Resumen y pago**:
   - Mostrar dirección de envío (editable, volver a step 0)
   - Lista de productos en la orden:
     * Imagen pequeña
     * Nombre
     * Cantidad × Precio unitario
   - Resumen de precios:
     * Subtotal
     * Descuento (cupón si aplica)
     * Envío: Gratis (o calcular)
     * Total
   - Checkbox "Acepto términos y condiciones"
   - Botón grande "Pagar con Stripe" (disabled hasta aceptar términos)

4. **Integración con Stripe**:

   Instalar: `flutter_stripe`
   
   **Configuración**:
   ```dart
   void initStripe() async {
     Stripe.publishableKey = AppConstants.stripePublishableKey;
     await Stripe.instance.applySettings();
   }
   ```
   
   **Crear Stripe Checkout Session**:
   - Endpoint: `POST /api/create-checkout-session`
   - Body: `{ items: [...], couponId: '...', successUrl: '...', cancelUrl: '...' }`
   - Response: `{ sessionId: '...', url: '...' }`
   
   **Flujo para Flutter**:
   Opción A (Hosted Checkout - recomendado):
   - Crear session en backend
   - Abrir URL de Stripe en WebView o navegador
   - Stripe redirige a success/cancel URL
   - Detectar redirección con deep links
   
   Opción B (Payment Sheet - nativo):
   - Crear payment intent en backend
   - Usar `Stripe.instance.initPaymentSheet()`
   - Presentar `paymentSheet`
   - Confirmar pago

5. **Crear orden después de pago exitoso**:
   
   **Endpoint**: `POST /api/orders/create`
   ```dart
   Future<Order> createOrder({
     required List<CartItem> items,
     required Address shippingAddress,
     required int totalAmount,
     String? couponId,
     String? guestEmail,
   }) async {
     final response = await _supabase.rpc('create_order', params: {
       'p_items': items.map((item) => {
         'product_id': item.product.id,
         'quantity': item.quantity,
         'price': item.product.price, // con descuento si aplica
       }).toList(),
       'p_total_amount': totalAmount,
       'p_shipping_address': shippingAddress.toJson(),
       'p_guest_email': guestEmail,
       'p_customer_name': shippingAddress.fullName,
     });
     
     // Si hay cupón, registrar uso
     if (couponId != null) {
       await _supabase.rpc('increment_coupon_usage_atomic', params: {
         'p_coupon_id': couponId,
         'p_order_id': response['order_id'],
       });
     }
     
     return Order.fromJson(response);
   }
   ```

6. **Implementar Stripe Webhook** (Backend - necesario):
   
   El proyecto Astro ya tiene webhook. Necesitas:
   - Desplegar endpoint `/api/webhooks/stripe` en tu backend
   - Configurar endpoint en Stripe Dashboard
   - Webhook escucha evento `payment_intent.succeeded`
   - Crea orden automáticamente
   - Envía email de confirmación

7. **Success Screen**:
   - Mostrar confetti animation o checkmark grande
   - Mensaje "¡Pedido realizado con éxito!"
   - Número de orden: `ORD-2026-XXXX`
   - Resumen de la orden
   - Botón "Ver mi pedido" → OrderDetailScreen
   - Botón "Seguir comprando" → ProductsScreen
   - **Importante**: Limpiar carrito y cupón aplicado

8. **Cancel Screen**:
   - Mensaje "Pago cancelado"
   - Explicación: "No se ha realizado ningún cargo"
   - Botón "Volver al carrito"
   - El carrito debe mantener los productos

9. **Guest Checkout**:
   - Si usuario NO autenticado, permitir checkout como guest
   - Pedir email en AddressStep
   - Orden se crea con `guest_email` en vez de `user_id`
   - Después del pago, sugerir crear cuenta

ENTREGABLES:
- CheckoutScreen con steps implementados
- AddressForm funcional con validación
- Integración con Stripe completa (Hosted Checkout o Payment Sheet)
- CreateOrder funcionando con RPC
- SuccessScreen y CancelScreen
- Limpieza de carrito después de compra
- Guest checkout funcional

IMPORTANTE:
- La función RPC `create_order()` valida stock automáticamente
- Los cupones solo se registran DESPUÉS del pago exitoso
- Debes validar que el carrito no esté vacío antes de permitir checkout
- El total enviado a Stripe debe coincidir EXACTAMENTE con el total del carrito
```

---

## PROMPT 8: Panel Administrativo

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/src/pages/admin/dashboard.astro` - Dashboard principal
2. `astro-original/src/pages/admin/productos/` - CRUD de productos
3. `astro-original/src/pages/admin/pedidos/` - Gestión de pedidos
4. `astro-original/src/pages/admin/devoluciones.astro` - Gestión de devoluciones
5. `astro-original/src/pages/admin/marcas/` - Gestión de marcas
6. `astro-original/src/pages/admin/configuracion.astro` - Configuración global
7. `astro-original/src/components/admin/` - Todos los componentes admin

FUNCIONALIDADES DEL ADMIN:
- Dashboard con estadísticas (productos, categorías, pedidos, ingresos)
- CRUD completo de productos (crear, editar, eliminar, gestión de stock)
- CRUD de categorías
- CRUD de marcas
- CRUD de subcategorías
- Gestión de pedidos (ver lista, cambiar estado, ver detalle)
- Gestión de devoluciones (aprobar/rechazar)
- Configuración global (habilitar ofertas, flash sales)
- Gestión de cupones (ver Prompt 9)
- Gestión de flash sales (ver Prompt 10)

TAREAS A REALIZAR:

1. **Crear AdminLayout**:
   - Drawer/Sidebar con navegación:
     * Dashboard
     * Productos
     * Categorías
     * Marcas
     * Pedidos
     * Devoluciones
     * Cupones
     * Flash Sales
     * Configuración
     * Cerrar sesión
   - AppBar con título de sección actual
   - Indicador visual de usuario admin

2. **AdminDashboardScreen**:
   - Tarjetas con estadísticas:
     * Total de productos
     * Productos con stock bajo (<10)
     * Total de categorías
     * Total de marcas
     * Pedidos totales
     * Pedidos pendientes
     * Ingresos del mes (suma de orders.total_amount)
     * Productos más vendidos (top 5)
   - Gráficos (opcional): ventas por día, productos por categoría
   - Lista de últimos 10 pedidos

3. **ProductsManagementScreen**:
   
   **Lista de productos**:
   - DataTable o ListView con todos los productos
   - Columnas: Imagen, Nombre, Categoría, Marca, Precio, Stock, Acciones
   - Botón "Crear Producto"
   - Botón de editar por producto
   - Botón de eliminar (con confirmación)
   - Buscador de productos
   - Filtro por categoría
   
   **Formulario Crear/Editar Producto**:
   - Campos:
     * Nombre (required)
     * Slug (auto-generado o editable)
     * Descripción (textarea, required)
     * Precio (en euros, convertir a centavos al guardar)
     * Stock (number input)
     * Categoría (dropdown)
     * Marca (dropdown, opcional)
     * Subcategoría (dropdown, opcional)
     * Imágenes (multi-upload a Cloudinary, ver Prompt 13)
   - Validación de todos los campos
   - Botón "Guardar Producto"
   - Preview de producto

4. **CategoriesManagementScreen**:
   - Lista de categorías
   - CRUD simple: Nombre, Slug, Descripción
   - No permitir eliminar si tiene productos asociados

5. **BrandsManagementScreen**:
   - Lista de marcas
   - CRUD: Nombre, Slug, Logo (upload), Descripción
   - Upload de logo a Cloudinary

6. **OrdersManagementScreen**:
   
   **Lista de pedidos**:
   - DataTable con todas las órdenes
   - Columnas: Número, Cliente, Email, Fecha, Total, Estado, Acciones
   - Filtros:
     * Por estado (todos, paid, shipped, delivered, etc.)
     * Por rango de fechas
   - Búsqueda por número de orden o email
   - Click en orden → ver detalle
   
   **Detalle de orden**:
   - Información del cliente:
     * Nombre
     * Email
     * Dirección de envío completa
   - Items de la orden:
     * Lista de productos
     * Cantidad × Precio
   - Resumen de precios (subtotal, descuento, total)
   - Estado actual con historial de cambios (de tabla `order_status_history`)
   - Dropdown para cambiar estado:
     * awaiting_payment
     * paid
     * shipped
     * delivered
     * cancelled
   - Botón "Actualizar Estado" (llama RPC `update_order_status()`)
   - Si estado = delivered: mostrar fecha de entrega

7. **ReturnsManagementScreen**:
   
   **Lista de devoluciones**:
   - Filtrar órdenes con estado `return_requested`
   - Mostrar:
     * Número de orden
     * Cliente
     * Fecha de solicitud
     * Días restantes para devolver (deadline en `return_deadline_at`)
     * Acciones
   
   **Procesar devolución**:
   - Ver detalle de la orden
   - Botón "Aprobar Devolución"
   - Checkbox "Restaurar stock"
   - Campo de notas (opcional)
   - Llamar RPC `process_return(order_id, approved: true, restore_stock: true, notes: '...')`
   - Botón "Rechazar Devolución"
   
   **Procesar reembolso**:
   - Para órdenes con estado `returned`
   - Botón "Procesar Reembolso"
   - Llamar RPC `process_refund(order_id)`
   - Cambiar estado a `refunded`

8. **SettingsScreen**:
   - Configuraciones globales (tabla `settings`):
     * Toggle "Habilitar sección de ofertas" (`offers_enabled`)
     * Toggle "Habilitar Flash Sales en inicio" (`flash_sale_enabled`)
     * Input "Duración Flash Sales (horas)" (`flash_sale_duration_hours`)
   - Guardar cambios en tabla `settings`

9. **Protección de rutas**:
   - Todas las pantallas admin deben verificar `isAdmin()` al cargar
   - Si no es admin: redirigir a login con mensaje de error
   - Usar AdminGuard en las rutas

ENTREGABLES:
- AdminLayout con navegación
- AdminDashboardScreen con estadísticas
- ProductsManagementScreen completo (CRUD)
- CategoriesManagementScreen
- BrandsManagementScreen
- OrdersManagementScreen con detalle y cambio de estado
- ReturnsManagementScreen
- SettingsScreen
- Guards de admin funcionando

IMPORTANTE:
- Solo usuarios con `is_admin = true` en tabla `profiles` pueden acceder
- Los cambios de estado de orden deben registrarse en `order_status_history`
- Las funciones RPC (`update_order_status`, `process_return`, etc.) ya verifican permisos
- La UI debe ser responsive (funcionar en tablets)
```

---

## PROMPT 9: Sistema de Cupones

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/COUPON_SYSTEM.md` - Documentación completa del sistema
2. `astro-original/migrations_coupons.sql` - Schema de cupones
3. `astro-original/src/lib/coupons.ts` - Lógica de validación
4. `astro-original/src/pages/api/checkout/validate-coupon.ts` - Endpoint validación
5. `astro-original/src/pages/admin/cupones/` - Gestión admin de cupones
6. `astro-original/increment_coupon_usage_atomic.sql` - Incrementar uso atómicamente

CARACTERÍSTICAS DEL SISTEMA DE CUPONES:
- Dos tipos de descuento: porcentaje (`percentage`) y fijo (`fixed_amount`)
- Validaciones:
  1. Código existe
  2. Cupón activo (`is_active = true`)
  3. Fecha de inicio (`valid_from`)
  4. Fecha de expiración (`valid_until`)
  5. Límite de usos (`max_uses` y `current_uses`)
  6. Compra mínima (`minimum_purchase`, opcional)
  7. (Opcional) Un uso por usuario
- Registro de uso en tabla `coupon_usage` (order_id, user_id, discount_applied)
- Incremento atómico de `current_uses`

TABLAS:
- `coupons`: id, code, discount_type, discount_value, is_active, valid_from, valid_until, max_uses, current_uses, minimum_purchase
- `coupon_usage`: id, coupon_id, order_id, user_id, discount_applied, created_at

TAREAS A REALIZAR:

1. **Crear CouponModel**:
   ```dart
   class CouponModel {
     final String id;
     final String code;
     final String discountType; // 'percentage' | 'fixed_amount'
     final double discountValue; // 20.0 = 20% o 500 céntimos
     final bool isActive;
     final DateTime? validFrom;
     final DateTime? validUntil;
     final int? maxUses;
     final int currentUses;
     final int? minimumPurchase; // en centavos
     
     int calculateDiscount(int cartTotal) {
       // Lógica de cálculo
     }
   }
   ```

2. **Crear CouponRepository**:
   ```dart
   abstract class CouponRepository {
     Future<Coupon?> validateCoupon(String code, int cartTotal);
     Future<void> applyCouponToOrder(String couponId, String orderId, int discountApplied);
   }
   ```

3. **Implementar validación de cupón**:
   
   **Método `validateCoupon(code, cartTotal)`**:
   - Fetch cupón por `code` de tabla `coupons`
   - Validaciones:
     1. Cupón existe? → "Código no válido"
     2. `is_active == true`? → "Cupón no disponible"
     3. `valid_from` <= NOW? → "Cupón válido desde [fecha]"
     4. `valid_until` >= NOW? → "Cupón expirado el [fecha]"
     5. `current_uses < max_uses`? → "Cupón alcanzó límite de usos"
     6. `cartTotal >= minimum_purchase`? → "Compra mínima de X€ requerida"
   - Si pasa todas: calcular descuento y retornar cupón

4. **Calcular descuento**:
   ```dart
   int calculateDiscount(Coupon coupon, int cartTotal) {
     if (coupon.discountType == 'percentage') {
       return (cartTotal * coupon.discountValue / 100).round();
     } else if (coupon.discountType == 'fixed_amount') {
       return coupon.discountValue.toInt(); // Ya en centavos
     }
     return 0;
   }
   ```

5. **Integrar cupón en CartProvider**:
   ```dart
   class CartProvider extends ChangeNotifier {
     Coupon? _appliedCoupon;
     
     Future<void> applyCoupon(String code) async {
       try {
         final coupon = await _couponRepo.validateCoupon(code, subtotal);
         if (coupon != null) {
           _appliedCoupon = coupon;
           notifyListeners();
           // Mostrar SnackBar de éxito
         }
       } catch (e) {
         // Mostrar error en SnackBar
       }
     }
     
     void removeCoupon() {
       _appliedCoupon = null;
       notifyListeners();
     }
     
     int get discountAmount {
       if (_appliedCoupon == null) return 0;
       return calculateDiscount(_appliedCoupon!, subtotal);
     }
     
     int get total => subtotal - discountAmount;
   }
   ```

6. **UI en CartScreen**:
   
   **Sección de cupón**:
   - TextField para código de cupón
   - Botón "Aplicar"
   - Si cupón aplicado:
     * Mostrar: "Cupón [CODE] aplicado: -X€"
     * Botón "Quitar" (icono X)
   - Mensajes de error en rojo si validación falla

7. **Registrar uso después de pago exitoso**:
   
   En `createOrder()` después de crear orden:
   ```dart
   if (appliedCoupon != null) {
     await _supabase.rpc('increment_coupon_usage_atomic', params: {
       'p_coupon_id': appliedCoupon.id,
       'p_order_id': orderId,
       'p_user_id': userId ?? null,
       'p_discount_applied': discountAmount,
     });
   }
   ```

8. **Admin: Gestión de Cupones**:
   
   **CouponsManagementScreen**:
   - Lista de cupones
   - Columnas: Código, Tipo, Valor, Activo, Usos, Expiración, Acciones
   - Botón "Crear Cupón"
   
   **Formulario Crear/Editar Cupón**:
   - Código (text input, uppercase)
   - Tipo de descuento (dropdown: Porcentaje / Cantidad fija)
   - Valor de descuento (number)
   - Activo (toggle switch)
   - Fecha de inicio (date picker)
   - Fecha de expiración (date picker)
   - Máximo de usos (number, opcional)
   - Compra mínima (number en euros, opcional)
   - Botón "Guardar Cupón"
   
   **Lista de usos de cupón**:
   - Ver tabla `coupon_usage` filtrada por `coupon_id`
   - Mostrar: Número de orden, Usuario, Descuento aplicado, Fecha

9. **RPC `increment_coupon_usage_atomic`**:
   Ya existe en el SQL. Asegúrate de que esté desplegado:
   ```sql
   CREATE OR REPLACE FUNCTION increment_coupon_usage_atomic(
     p_coupon_id UUID,
     p_order_id UUID,
     p_user_id UUID,
     p_discount_applied INTEGER
   )
   RETURNS JSONB
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     -- Incrementar current_uses
     UPDATE coupons SET current_uses = current_uses + 1
     WHERE id = p_coupon_id;
     
     -- Insertar en coupon_usage
     INSERT INTO coupon_usage (coupon_id, order_id, user_id, discount_applied)
     VALUES (p_coupon_id, p_order_id, p_user_id, p_discount_applied);
     
     RETURN jsonb_build_object('success', true);
   END;
   $$;
   ```

ENTREGABLES:
- CouponModel y CouponRepository
- Validación de cupón implementada
- Integración en CartProvider
- UI de cupón en CartScreen
- Registro de uso después de pago
- CouponsManagementScreen para admin
- RPC deployado en Supabase

IMPORTANTE:
- El cupón solo se aplica si pasa TODAS las validaciones
- El descuento se calcula sobre el subtotal (antes de envío)
- El cupón NO se persiste en localStorage (solo en sesión)
- Los usos se registran SOLO después de pago exitoso
- Mostrar siempre mensajes de error claros al usuario
```

---

## PROMPT 10: Flash Sales

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/FLASH_SALE_SETUP.md` - Documentación completa
2. `astro-original/migration_flash_sale.sql` - Schema de flash sales
3. `astro-original/src/components/islands/CountdownTimer.tsx` - Timer reactivo
4. `astro-original/src/components/admin/FlashSaleManager.tsx` - Gestión admin
5. `astro-original/src/pages/index.astro` - Sección en homepage

CARACTERÍSTICAS DE FLASH SALES:
- Productos marcados como flash sale (`is_flash_sale = true`)
- Descuento porcentual (`flash_sale_discount`)
- Fecha de finalización (`flash_sale_end_time`)
- Badge "FLASH SALE" visible en producto
- Countdown timer (HH:MM:SS) hasta finalización
- Precio original tachado, precio con descuento destacado
- Se muestra sección en homepage con 4-6 productos
- Admin puede activar/desactivar flash sales por producto

TABLAS (campos agregados a `products`):
- `is_flash_sale` boolean
- `flash_sale_discount` numeric (porcentaje, ej: 20 = 20%)
- `flash_sale_end_time` timestamp with time zone

TAREAS A REALIZAR:

1. **Actualizar ProductModel**:
   ```dart
   class ProductModel {
     // ... campos existentes
     final bool isFlashSale;
     final double? flashSaleDiscount;
     final DateTime? flashSaleEndTime;
     
     int get displayPrice {
       if (isFlashSale && flashSaleDiscount != null) {
         return (price * (1 - flashSaleDiscount / 100)).round();
       }
       return price;
     }
     
     bool get hasActiveFlashSale {
       if (!isFlashSale || flashSaleEndTime == null) return false;
       return DateTime.now().isBefore(flashSaleEndTime!);
     }
   }
   ```

2. **Crear CountdownTimer widget**:
   ```dart
   class CountdownTimer extends StatefulWidget {
     final DateTime endTime;
     final TextStyle? textStyle;
     
     // Actualiza cada segundo
     // Muestra formato: HH:MM:SS
     // Cuando termina: "¡Oferta Finalizada!"
   }
   ```

3. **Actualizar ProductCard**:
   - Si `hasActiveFlashSale == true`:
     * Mostrar badge "⚡ FLASH SALE" en esquina superior
     * Mostrar descuento "-20%" en badge
     * Precio original tachado
     * Nuevo precio destacado (más grande, color rojo/rosa)
     * CountdownTimer debajo del precio

4. **Crear FlashSalesSection para homepage**:
   ```dart
   class FlashSalesSection extends StatelessWidget {
     // Fetch productos con `is_flash_sale = true` AND `flash_sale_end_time > NOW()`
     // Grid horizontal scrollable de 4-6 productos
     // Título: "⚡ Flash Sales - Ofertas por Tiempo Limitado"
     // CountdownTimer general (usando el tiempo más cercano)
     // Si no hay flash sales activos: no mostrar sección
   }
   ```

5. **Filtro de Flash Sales en ProductsListScreen**:
   - Agregar toggle "Solo Flash Sales"
   - Filtrar productos con `hasActiveFlashSale == true`

6. **Admin: FlashSaleManager**:
   
   **FlashSaleManagerScreen**:
   - Lista de TODOS los productos
   - Columnas: Imagen, Nombre, Precio, Flash Sale Status, Descuento, Tiempo restante, Acciones
   - Para cada producto:
     * Toggle para activar/desactivar flash sale
     * Si activo:
       - Input de descuento (%) 
       - DateTimePicker para fecha de finalización
       - Botón "Guardar"
     * Si inactivo:
       - Botón "Activar Flash Sale"
   
   **Actualizar flash sale**:
   ```dart
   Future<void> updateFlashSale(String productId, {
     required bool isFlashSale,
     double? discount,
     DateTime? endTime,
   }) async {
     await _supabase.from('products').update({
       'is_flash_sale': isFlashSale,
       'flash_sale_discount': discount,
       'flash_sale_end_time': endTime?.toIso8601String(),
     }).eq('id', productId);
   }
   ```

7. **Configuración global**:
   - En SettingsScreen (admin):
     * Toggle "Habilitar Flash Sales en Homepage" (`flash_sale_enabled` en tabla `settings`)
   - Si deshabilitado: no mostrar FlashSalesSection

8. **Auto-expiración**:
   - Crear servicio/cron que revise periódicamente:
     * Productos con `flash_sale_end_time < NOW()`
     * Actualizar `is_flash_sale = false` automáticamente
   - Alternativa: verificar en cliente al cargar productos

9. **Notificaciones** (opcional):
   - Push notification cuando flash sale está por terminar (últimos 30 min)
   - Email a usuarios con productos en wishlist que entran en flash sale

ENTREGABLES:
- ProductModel actualizado con campos flash sale
- CountdownTimer widget funcional
- ProductCard mostrando badge y descuento
- FlashSalesSection en homepage
- Filtro de flash sales en catálogo
- FlashSaleManager para admin
- Configuración global de flash sales
- Auto-expiración implementada

IMPORTANTE:
- El precio mostrado debe ser el precio con descuento si flash sale activo
- Al añadir al carrito: guardar el precio con descuento aplicado
- El countdown debe actualizarse en tiempo real cada segundo
- Si flash sale expira mientras usuario tiene producto en carrito: mantener precio (decisión de negocio)
```

---

## PROMPT 11: Reviews y Ratings

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/REVIEWS_SETUP.md` - Documentación completa
2. `astro-original/migration_reviews.sql` - Schema de reviews
3. `astro-original/src/components/reviews/ReviewsList.tsx` - Lista de reviews
4. `astro-original/src/components/reviews/ReviewForm.tsx` - Formulario
5. `astro-original/src/components/reviews/ProductRating.tsx` - Widget de rating
6. `astro-original/src/pages/api/reviews/` - Endpoints de reviews

CARACTERÍSTICAS DEL SISTEMA DE REVIEWS:
- Solo usuarios que compraron el producto pueden dejar review
- Rating de 1 a 5 estrellas
- Comentario opcional (max 500 caracteres)
- Un review por usuario por producto
- Editar/eliminar propios reviews
- Ver todas las reviews de un producto
- Promedio de rating y distribución (5★: 10, 4★: 5, etc.)

TABLAS:
- `reviews`: id, product_id, user_id, rating (1-5), comment, created_at, updated_at
- Vista `product_ratings`: product_id, avg_rating, total_reviews, rating_distribution

FUNCIÓN RPC:
- `user_has_purchased_product(p_product_id, p_user_id)` → boolean

TAREAS A REALIZAR:

1. **Crear ReviewModel**:
   ```dart
   class ReviewModel {
     final String id;
     final String productId;
     final String userId;
     final int rating; // 1-5
     final String? comment;
     final DateTime createdAt;
     final DateTime? updatedAt;
     
     // fromJson, toJson
   }
   ```

2. **Crear ProductRatingModel** (para agregados):
   ```dart
   class ProductRatingModel {
     final String productId;
     final double avgRating;
     final int totalReviews;
     final Map<int, int> ratingDistribution; // {5: 10, 4: 5, 3: 2, ...}
   }
   ```

3. **Crear ReviewRepository**:
   ```dart
   abstract class ReviewRepository {
     Future<List<Review>> getProductReviews(String productId);
     Future<ProductRating?> getProductRating(String productId);
     Future<bool> canUserReview(String productId, String userId);
     Future<Review?> getUserReview(String productId, String userId);
     Future<Review> createReview(String productId, int rating, String? comment);
     Future<Review> updateReview(String reviewId, int rating, String? comment);
     Future<void> deleteReview(String reviewId);
   }
   ```

4. **Implementar `canUserReview`**:
   ```dart
   Future<bool> canUserReview(String productId, String userId) async {
     // Verificar si ya dejó review
     final existingReview = await _supabase
       .from('reviews')
       .select()
       .eq('product_id', productId)
       .eq('user_id', userId)
       .maybeSingle();
     
     if (existingReview != null) return false;
     
     // Verificar si compró el producto
     final hasPurchased = await _supabase.rpc(
       'user_has_purchased_product',
       params: {'p_product_id': productId, 'p_user_id': userId}
     );
     
     return hasPurchased as bool;
   }
   ```

5. **Widget RatingStars**:
   ```dart
   class RatingStars extends StatelessWidget {
     final double rating; // 0.0 - 5.0
     final double size;
     final Color color;
     
     // Muestra estrellas llenas, medias y vacías
     // Ejemplo: 4.5 → ★★★★½
   }
   ```

6. **Widget ProductRating** (para ProductCard):
   ```dart
   class ProductRatingWidget extends StatelessWidget {
     final String productId;
     
     // Muestra: ★★★★★ 4.5 (32)
     // Carga rating desde product_ratings
   }
   ```

7. **ReviewsList Widget**:
   ```dart
   class ReviewsList extends StatelessWidget {
     final String productId;
     
     // Muestra:
     // - Resumen: ★★★★★ 4.5 de 5 (32 reseñas)
     // - Gráfico de distribución:
     //   5★ ████████ 20
     //   4★ ████ 8
     //   3★ ██ 3
     //   ...
     // - Lista de reviews:
     //   * Avatar genérico
     //   * Rating (estrellas)
     //   * Comentario
     //   * Fecha (hace 3 días)
     //   * Si es review del usuario: botones Editar/Eliminar
   }
   ```

8. **ReviewForm Widget**:
   ```dart
   class ReviewFormWidget extends StatefulWidget {
     final String productId;
     final Review? existingReview; // Si edita
     
     // Formulario con:
     // - Selector de estrellas (tap para seleccionar 1-5)
     // - TextField para comentario (opcional, max 500 chars)
     // - Botón "Publicar Reseña" o "Actualizar Reseña"
     // - Si existingReview != null: botón "Eliminar Reseña"
     
     // Validaciones:
     // - Rating requerido
     // - Comentario max 500 chars
     
     // Al enviar: llamar createReview() o updateReview()
   }
   ```

9. **Integrar en ProductDetailScreen**:
   - Debajo de la descripción del producto:
     * ProductRatingWidget (resumen)
     * ReviewFormWidget (si usuario puede dejar review)
     * ReviewsList (todas las reviews)

10. **Actualizar ProductCard**:
    - Mostrar ProductRatingWidget debajo del precio
    - Ejemplo: ⭐ 4.5 (32)

11. **Permisos y validaciones**:
    - Solo usuarios autenticados pueden ver formulario de review
    - Si no compró producto: mostrar mensaje "Debes comprar este producto para dejar una reseña"
    - Si ya dejó review: mostrar formulario de edición
    - Solo puede editar/eliminar sus propias reviews

12. **RLS en Supabase**:
    Ya configurado en migration_reviews.sql:
    - Todos pueden ver reviews
    - Solo usuarios autenticados pueden crear
    - Solo dueño puede editar/eliminar su review
    - Verificar compra con función `user_has_purchased_product()`

ENTREGABLES:
- ReviewModel y ProductRatingModel
- ReviewRepository completo
- RatingStars widget
- ProductRatingWidget
- ReviewsList widget
- ReviewForm widget
- Integración en ProductDetailScreen y ProductCard
- Validación de permisos implementada

IMPORTANTE:
- La función RPC `user_has_purchased_product()` debe estar deployada en Supabase
- Las reviews se ordenan por fecha (más recientes primero)
- El promedio de rating debe actualizarse automáticamente (vista `product_ratings`)
- Mostrar mensaje amigable si no hay reviews todavía
```

---

## PROMPT 12: Sistema Post-Venta

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/SISTEMA_POST_VENTA_RESUMEN.md` - Resumen completo
2. `astro-original/ADMIN_POST_SALE_SETUP.md` - Setup admin
3. `astro-original/migration_item_returns.sql` - Sistema de devoluciones
4. `astro-original/src/pages/mi-cuenta/pedidos/[id].astro` - Detalle de orden
5. `astro-original/src/components/orders/ReturnModal.tsx` - Modal de devolución
6. `astro-original/src/pages/admin/devoluciones.astro` - Admin devoluciones
7. `astro-original/rpc_admin_post_sale.sql` - Funciones RPC

FLUJO DEL SISTEMA POST-VENTA:

**Usuario:**
1. Orden entregada (estado `delivered`)
2. Puede solicitar devolución dentro de 30 días
3. Formulario de solicitud con motivo
4. Sistema cambia estado a `return_requested`
5. Muestra dirección de devolución y plazo (14 días)
6. Admin aprueba/rechaza
7. Si aprueba: estado `returned`
8. Admin procesa reembolso: estado `refunded`

**Admin:**
1. Ve lista de devoluciones solicitadas
2. Revisa motivo y detalles de orden
3. Aprueba (con/sin restaurar stock) o rechaza
4. Procesa reembolso cuando recibe el producto

TABLAS Y CAMPOS:
- `orders` con campos adicionales:
  * `delivered_at` (timestamp)
  * `return_initiated_at` (timestamp)
  * `return_deadline_at` (timestamp, +14 días)
  * `return_address` (jsonb con dirección)
- `order_status_history` para auditoría

FUNCIONES RPC:
- `request_return(order_id, reason)` - Usuario solicita devolución
- `process_return(order_id, approved, restore_stock, notes)` - Admin procesa
- `process_refund(order_id)` - Admin procesa reembolso

TAREAS A REALIZAR:

1. **Actualizar OrderModel**:
   ```dart
   class OrderModel {
     // ... campos existentes
     final String status; // 'paid', 'shipped', 'delivered', 'return_requested', 'returned', 'refunded', 'cancelled'
     final DateTime? deliveredAt;
     final DateTime? returnInitiatedAt;
     final DateTime? returnDeadlineAt;
     final Address? returnAddress;
     
     bool get canRequestReturn {
       if (status != 'delivered' || deliveredAt == null) return false;
       final daysSinceDelivery = DateTime.now().difference(deliveredAt!).inDays;
       return daysSinceDelivery <= 30;
     }
     
     int get daysLeftToReturn {
       if (returnDeadlineAt == null) return 0;
       return returnDeadlineAt!.difference(DateTime.now()).inDays;
     }
   }
   ```

2. **Crear OrderStatusHistory model**:
   ```dart
   class OrderStatusHistoryModel {
     final String id;
     final String orderId;
     final String? fromStatus;
     final String toStatus;
     final String? changedBy;
     final String? changedByType; // 'user', 'admin', 'system'
     final String? notes;
     final DateTime createdAt;
   }
   ```

3. **MyOrdersScreen** (para usuarios):
   - Lista de todas las órdenes del usuario
   - Filtros por estado
   - Card por orden:
     * Número de orden
     * Fecha
     * Estado (con badge de color)
     * Total
     * Botón "Ver Detalle"

4. **OrderDetailScreen** (usuario):
   - Número de orden grande
   - Estado actual con badge
   - Timeline de estados:
     * Pagado ✓
     * Enviado ✓
     * Entregado ✓
     * (si aplica) Devolución solicitada
   - Dirección de envío
   - Lista de productos
   - Resumen de precios
   - **Botón "Solicitar Devolución"** si `canRequestReturn == true`
   - Si estado `return_requested`:
     * Mensaje: "Devolución solicitada el [fecha]"
     * Dirección de devolución
     * Contador: "X días restantes para enviar el paquete"
     * Instrucciones de devolución
   - Si estado `returned`: "Devolución recibida, procesando reembolso"
   - Si estado `refunded`: "Reembolso procesado el [fecha]"

5. **ReturnRequestModal/Screen**:
   ```dart
   class ReturnRequestScreen extends StatefulWidget {
     final Order order;
     
     // Formulario:
     // - Dropdown motivo:
     //   * "Producto defectuoso"
     //   * "Talla/color incorrectos"
     //   * "No cumple expectativas"
     //   * "Cambié de opinión"
     //   * "Otro"
     // - TextField descripción (opcional, max 500 chars)
     // - Checkbox "Acepto políticas de devolución"
     // - Botón "Solicitar Devolución"
     
     // Al enviar: llamar request_return()
   }
   ```

6. **Implementar `requestReturn()`**:
   ```dart
   Future<void> requestReturn(String orderId, String reason) async {
     final response = await _supabase.rpc('request_return', params: {
       'p_order_id': orderId,
       'p_reason': reason,
     });
     
     if (response['success'] == true) {
       // Mostrar modal de éxito con dirección de devolución
       // Actualizar UI
     } else {
       throw Exception(response['message']);
     }
   }
   ```

7. **Admin: ReturnsManagementScreen**:
   - Lista de órdenes con `status = 'return_requested'`
   - Card por orden:
     * Número de orden
     * Cliente (nombre + email)
     * Motivo de devolución
     * Fecha de solicitud
     * Días restantes (hasta `return_deadline_at`)
     * Productos de la orden
     * Botones: "Aprobar" / "Rechazar"

8. **Admin: ProcessReturnDialog**:
   ```dart
   // Al click "Aprobar":
   showDialog(
     // Título: "Aprobar Devolución"
     // Checkbox: "Restaurar stock de productos"
     // TextField: Notas (opcional)
     // Botón: "Confirmar Aprobación"
   );
   
   // Llamar process_return(orderId, approved: true, restoreStock: true, notes: '...')
   ```

9. **Implementar `processReturn()`**:
   ```dart
   Future<void> processReturn({
     required String orderId,
     required bool approved,
     required bool restoreStock,
     String? notes,
   }) async {
     final response = await _supabase.rpc('process_return', params: {
       'p_order_id': orderId,
       'p_approved': approved,
       'p_restore_stock': restoreStock,
       'p_notes': notes,
     });
     
     if (response['success'] != true) {
       throw Exception(response['message']);
     }
   }
   ```

10. **Admin: Procesar Reembolso**:
    - Lista separada de órdenes con `status = 'returned'`
    - Botón "Procesar Reembolso"
    - Confirmación
    - Llamar `process_refund(orderId)`
    - Cambiar estado a `refunded`

11. **Historial de estados** (OrderDetailScreen):
    - Mostrar timeline vertical con todos los cambios de estado
    - Fetch de tabla `order_status_history`
    - Mostrar:
      * Estado anterior → Estado nuevo
      * Quién lo cambió (user/admin)
      * Fecha y hora
      * Notas (si hay)

ENTREGABLES:
- OrderModel actualizado con campos de devolución
- MyOrdersScreen
- OrderDetailScreen con timeline y botón de devolución
- ReturnRequestModal
- ReturnsManagementScreen para admin
- ProcessReturnDialog
- Implementación de RPCs (request_return, process_return, process_refund)
- Historial de estados visible

IMPORTANTE:
- Solo órdenes `delivered` pueden solicitar devolución
- Ventana de 30 días desde `delivered_at`
- Ventana de 14 días para enviar el paquete después de solicitar
- Admin puede aprobar sin restaurar stock (producto dañado)
- El reembolso es manual (admin lo procesa en Stripe aparte)
- Todas las acciones se registran en `order_status_history`
```

---

## PROMPT 13: Integraciones Externas

```
Continuando con la migración a Flutter de ÉCLAT Beauty.

REVISA estos archivos del proyecto Astro:
1. `astro-original/BREVO_EMAIL_SETUP.md` - Sistema de emails
2. `astro-original/CLOUDINARY_SETUP.md` - Subida de imágenes
3. `astro-original/WELCOME_EMAIL_SYSTEM.md` - Email de bienvenida
4. `astro-original/NEWSLETTER_DIAGNOSTICO.md` - Newsletter
5. `astro-original/src/pages/api/emails/` - Endpoints de emails
6. `astro-original/src/pages/api/cloudinary/` - Upload a Cloudinary
7. `astro-original/src/pages/api/newsletter.ts` - Suscripción newsletter

INTEGRACIONES:
1. **Brevo (Emails transaccionales)**:
   - Confirmación de registro
   - Confirmación de orden
   - Notificación de envío
   - Devolución aprobada
   - Recuperar contraseña

2. **Cloudinary (Gestión de imágenes)**:
   - Upload de imágenes de productos
   - Upload de logos de marcas
   - Transformaciones automáticas
   - CDN para carga rápida

3. **Newsletter (Brevo)**:
   - Suscripción a newsletter
   - Tabla `newsletter_subscribers`

TAREAS A REALIZAR:

### 1. SISTEMA DE EMAILS (BREVO)

**Crear EmailService**:
```dart
class EmailService {
  final String _apiKey = AppConstants.brevoApiKey;
  final String _apiUrl = 'https://api.brevo.com/v3/smtp/email';
  
  Future<void> sendWelcomeEmail({
    required String email,
    required String userName,
  }) async {
    await _sendEmail(
      to: email,
      subject: '¡Bienvenido a ÉCLAT Beauty!',
      htmlContent: _buildWelcomeTemplate(userName),
    );
  }
  
  Future<void> sendOrderConfirmation({
    required String email,
    required String customerName,
    required String orderNumber,
    required List<OrderItem> items,
    required int total,
  }) async {
    await _sendEmail(
      to: email,
      subject: 'Confirmación de Pedido #$orderNumber',
      htmlContent: _buildOrderConfirmationTemplate(/* ... */),
    );
  }
  
  Future<void> sendShippingNotification({
    required String email,
    required String customerName,
    required String trackingNumber,
    String? trackingUrl,
  }) async { /* ... */ }
  
  Future<void> sendReturnApproved({
    required String email,
    required String customerName,
    required String returnNumber,
  }) async { /* ... */ }
  
  Future<void> sendPasswordReset({
    required String email,
    required String resetLink,
  }) async { /* ... */ }
  
  Future<void> _sendEmail({
    required String to,
    required String subject,
    required String htmlContent,
  }) async {
    // Implementación con http package
    final response = await http.post(
      Uri.parse(_apiUrl),
      headers: {
        'api-key': _apiKey,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'sender': {
          'name': 'ÉCLAT Beauty',
          'email': AppConstants.fromEmail,
        },
        'to': [{'email': to}],
        'subject': subject,
        'htmlContent': htmlContent,
      }),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Error sending email: ${response.body}');
    }
  }
}
```

**Templates HTML** (crear archivos separados):
- `email_templates/welcome.html`
- `email_templates/order_confirmation.html`
- `email_templates/shipping_notification.html`
- etc.

**Integrar en flujo de la app**:
- Después de registro exitoso: `sendWelcomeEmail()`
- Después de crear orden: `sendOrderConfirmation()`
- Cuando admin marca orden como `shipped`: `sendShippingNotification()`
- Cuando admin aprueba devolución: `sendReturnApproved()`

### 2. CLOUDINARY (IMÁGENES)

**Crear CloudinaryService**:
```dart
class CloudinaryService {
  final String _cloudName = AppConstants.cloudinaryCloudName;
  final String _uploadPreset = AppConstants.cloudinaryUploadPreset;
  
  Future<String> uploadImage(File image, String folder) async {
    final url = Uri.parse(
      'https://api.cloudinary.com/v1_1/$_cloudName/image/upload'
    );
    
    final request = http.MultipartRequest('POST', url);
    request.fields['upload_preset'] = _uploadPreset;
    request.fields['folder'] = folder; // 'products', 'brands', etc.
    request.files.add(await http.MultipartFile.fromPath('file', image.path));
    
    final response = await request.send();
    final responseData = await response.stream.bytesToString();
    final jsonData = jsonDecode(responseData);
    
    if (response.statusCode == 200) {
      return jsonData['secure_url'];
    } else {
      throw Exception('Error uploading image: $responseData');
    }
  }
  
  Future<List<String>> uploadMultipleImages(
    List<File> images,
    String folder,
  ) async {
    final urls = <String>[];
    for (final image in images) {
      final url = await uploadImage(image, folder);
      urls.add(url);
    }
    return urls;
  }
  
  String getTransformedUrl(
    String originalUrl, {
    int? width,
    int? height,
    String? crop,
    String? quality,
  }) {
    // Ejemplo: transformar URL para diferentes tamaños
    // https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/sample.jpg
    // Implementar lógica de transformación
  }
}
```

**ImagePickerWidget** (para admin):
```dart
class ImagePickerWidget extends StatefulWidget {
  final Function(List<File>) onImagesPicked;
  final int maxImages;
  
  // Permite seleccionar múltiples imágenes
  // Muestra preview
  // Botón "Eliminar" por imagen
  // Botón "Subir" que llama CloudinaryService
}
```

**Integrar en ProductForm**:
- Permitir subir hasta 5 imágenes por producto
- Mostrar preview de imágenes seleccionadas
- Upload a Cloudinary antes de guardar producto en BD
- Guardar URLs en array `images`

**Optimizaciones**:
- Usar `cached_network_image` con Cloudinary URLs
- Cargar diferentes tamaños según contexto:
  * Thumbnails: 200x200
  * Cards: 400x400
  * Detalle: 800x800
  * Zoom: 1200x1200

### 3. NEWSLETTER

**Crear NewsletterSubscription table** (si no existe):
Ya existe en el schema. Verificar migración.

**Crear NewsletterService**:
```dart
class NewsletterService {
  final SupabaseClient _supabase;
  
  Future<void> subscribe(String email) async {
    // Validar email
    if (!EmailValidator.validate(email)) {
      throw Exception('Email inválido');
    }
    
    // Verificar si ya está suscrito
    final existing = await _supabase
      .from('newsletter_subscribers')
      .select()
      .eq('email', email)
      .maybeSingle();
    
    if (existing != null) {
      throw Exception('Este email ya está suscrito');
    }
    
    // Insertar
    await _supabase.from('newsletter_subscribers').insert({
      'email': email,
      'is_active': true,
    });
    
    // Opcional: Añadir a lista de Brevo también
    // await _addToBrevoList(email);
  }
  
  Future<void> unsubscribe(String email) async {
    await _supabase
      .from('newsletter_subscribers')
      .update({'is_active': false})
      .eq('email', email);
  }
}
```

**NewsletterWidget** (Footer):
```dart
class NewsletterWidget extends StatefulWidget {
  // TextField para email
  // Botón "Suscribirse"
  // Validación
  // Mensaje de éxito/error
  // Mostrar en footer de la app
}
```

**Admin: Ver suscriptores**:
- Pantalla para ver lista de suscriptores
- Exportar lista a CSV
- Ver estadísticas (total, activos, inactivos)

### 4. OTRAS INTEGRACIONES (OPCIONAL)

**Google Analytics** (package: `firebase_analytics`):
- Tracking de eventos (ver producto, añadir al carrito, compra)
- Pantallas vistas
- Conversiones

**Push Notifications** (package: `firebase_messaging`):
- Notificar cuando orden cambia de estado
- Ofertas flash comenzando
- Producto en wishlist en oferta

**Deep Links** (package: `uni_links`):
- Abrir producto específico desde link
- Recuperar contraseña (link en email)
- Tracking de órdenes

ENTREGABLES:
- EmailService completo con todas las funciones
- Templates HTML de emails
- CloudinaryService funcional
- ImagePickerWidget para admin
- NewsletterService y widget
- Integración de servicios en flujos de la app
- (Opcional) Analytics y Push Notifications

IMPORTANTE:
- Configurar API keys en .env (nunca en código)
- Manejar errores de red (retry logic)
- Mostrar loading states durante uploads
- Comprimir imágenes antes de subir a Cloudinary
- Los emails deben tener diseño responsive (HTML)
- Incluir enlaces de "darse de baja" en emails de newsletter
```

---

## 🎯 PROMPT FINAL: Testing y Despliegue

```
Has completado la migración de ÉCLAT Beauty a Flutter. Ahora necesitamos:

1. **Testing**:
   - Unit tests para repositorios
   - Widget tests para componentes clave
   - Integration tests para flujos completos:
     * Registro → Login → Añadir al carrito → Checkout → Pago
     * Admin: Crear producto → Ver en catálogo → Editar → Eliminar
     * Solicitar devolución → Admin aprobar → Procesar reembolso
   - Test de funciones RPC en Supabase

2. **Performance**:
   - Optimizar queries (usar índices en Supabase)
   - Implementar caché en app (productos, categorías)
   - Lazy loading de imágenes
   - Pagination en listas largas
   - Reducir rebuilds innecesarios (const widgets)

3. **Seguridad**:
   - Verificar todas las políticas RLS en Supabase
   - Validar inputs en cliente y servidor
   - Sanitizar datos antes de insertar en BD
   - No exponer API keys (usar .env)
   - HTTPS obligatorio

4. **UX/UI Final**:
   - Animaciones suaves (Hero, Fade, Slide)
   - Loading states en todas las pantallas
   - Error states con retry
   - Empty states con call-to-action
   - Haptic feedback en acciones importantes
   - Modo oscuro (opcional)

5. **Build y Despliegue**:
   
   **Android**:
   - Configurar signing key
   - Generar release APK/AAB
   - Subir a Google Play Console
   - Configurar deep links
   
   **iOS** (si aplica):
   - Configurar Apple Developer account
   - Certificates y provisioning profiles
   - Build para App Store
   
   **Web** (si aplica):
   - Build optimizado (flutter build web --release)
   - Deploy en hosting (Vercel, Netlify, Firebase Hosting)
   - Configurar dominio

6. **Documentación**:
   - README.md con instrucciones de setup
   - Documentar variables de entorno
   - Guía de deployment
   - Arquitectura del proyecto
   - API documentation

CREA UN PLAN DE TESTING Y DESPLIEGUE completo para el proyecto.
```

---

## ✅ CHECKLIST DE MIGRACIÓN COMPLETA

- [ ] Prompt 1: Configuración inicial y estructura
- [ ] Prompt 2: Arquitectura y modelos de datos
- [ ] Prompt 3: Base de datos y backend Supabase
- [ ] Prompt 4: Autenticación y autorización
- [ ] Prompt 5: Catálogo de productos y filtrado
- [ ] Prompt 6: Sistema de carrito de compras
- [ ] Prompt 7: Checkout y pagos con Stripe
- [ ] Prompt 8: Panel administrativo completo
- [ ] Prompt 9: Sistema de cupones de descuento
- [ ] Prompt 10: Flash sales y ofertas
- [ ] Prompt 11: Sistema de reviews y ratings
- [ ] Prompt 12: Sistema post-venta y devoluciones
- [ ] Prompt 13: Integraciones externas (Email, Cloudinary, Newsletter)
- [ ] Testing y despliegue

---

## 📝 NOTAS IMPORTANTES

1. **Orden de implementación**: Los prompts están diseñados para ejecutarse en orden porque cada uno depende del anterior.

2. **Testing continuo**: Después de cada prompt, prueba que todo funciona antes de continuar.

3. **Base de datos**: Ejecuta TODOS los archivos SQL en Supabase antes de comenzar con Flutter:
   - `database-schema.sql`
   - `migrations_coupons.sql`
   - `migration_flash_sale.sql`
   - `migration_reviews.sql`
   - `migration_item_returns.sql`
   - `migration_wishlist.sql`
   - `migration_newsletter.sql`
   - Todos los archivos `.sql` relacionados

4. **Variables de entorno requeridas**:
   ```env
   PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=xxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   BREVO_API_KEY=xkeysib_xxx
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_UPLOAD_PRESET=xxx
   FROM_EMAIL=noreply@eclatbeauty.com
   FROM_NAME=ÉCLAT Beauty
   ```

5. **Packages clave de Flutter**:
   - supabase_flutter
   - provider o riverpod
   - flutter_stripe
   - cached_network_image
   - shared_preferences o hive
   - image_picker
   - http
   - intl (formateo de fechas/precios)

---

## 🆘 SOPORTE

Si encuentras problemas durante la migración:

1. Verifica que las funciones RPC estén deployadas en Supabase
2. Revisa las políticas RLS (Row Level Security)
3. Consulta los logs de errores en Flutter DevTools
4. Verifica las variables de entorno
5. Revisa la documentación original del proyecto Astro

---

**¡Buena suerte con la migración a Flutter!** 🚀
