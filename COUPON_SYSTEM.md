# 🎟️ Sistema de Cupones - Documentación Completa

## 📋 Resumen General

Se ha realizado una revisión exhaustiva y mejora completa del sistema de códigos de descuento (cupones) de ÉCLAT Beauty Tienda. El sistema ahora incluye:

✅ Validación robusta con 8+ puntos de control  
✅ Manejo de errores mejorado en todas las fases  
✅ Mensajes de éxito integrados en la UI  
✅ Admin dashboard para tracking de uso  
✅ Logs detallados para debugging  
✅ Separación completa de lógica usuario/admin  

---

## 🏗️ Arquitectura del Sistema

### 1. **Base de Datos**
```
Tablas principales:
├── coupons (Código, tipo de descuento, límites, fechas)
├── coupon_usage (Registro de cada uso: usuario, orden, descuento)
└── orders (Contiene relación con cupones aplicados)
```

### 2. **Flujo de Aplicación**

```
Usuario compra
    ↓
[Carrito: src/pages/carrito.astro]
    ↓
Input cupón + click "Aplicar"
    ↓
[Validación: POST /api/checkout/validate-coupon]
    ↓
{valid: true/false, error?: string, coupon?: {...}}
    ↓
Si válido: Aplicar descuento en carrito (Nano Store)
    ↓
[Checkout: src/components/checkout/CheckoutFlow.tsx]
    ↓
Muestra descuento y permite remover
    ↓
Click "Continuar a Pago"
    ↓
[Crear orden: POST /api/orders/create]
    ↓
Incrementar current_uses en tabla coupons
    ↓
Insertar registro en coupon_usage
    ↓
[Stripe payment]
    ↓
[Success page: clears cart + coupon from localStorage]
```

---

## 🔍 Validación de Cupones (8 Puntos de Control)

**Archivo:** `src/lib/coupons.ts` → `validateCoupon()`

### Validaciones Implementadas:

| # | Validación | Mensaje de Error |
|---|-----------|-----------------|
| 1 | Código no vacío | "Debes ingresar un código de descuento" |
| 2 | Monto > 0 | "El monto del carrito debe ser mayor a 0" |
| 3 | Código existe | "Código de descuento no válido o no existe" |
| 4 | Cupón activo | "Este cupón no está disponible actualmente" |
| 5 | Fecha inicio | "Este cupón será válido a partir del [fecha]" |
| 6 | Fecha expiración | "Este cupón expiró el [fecha]" |
| 7 | Límite de usos | "Este cupón ha alcanzado el máximo de usos ([N])" |
| 8 | Compra mínima | "Compra mínima de €X requerida. Tu carrito tiene €Y" |

**Opcional:**
- Check si usuario ya usó cupón (actualmente solo se registra)

---

## 💻 Endpoints y APIs

### 1. **Validar Cupón**
```
POST /api/checkout/validate-coupon

Request:
{
  "code": "SUMMER2024",
  "totalAmount": 5990  // en centavos
}

Response (éxito):
{
  "valid": true,
  "coupon": {
    "id": "uuid",
    "code": "SUMMER2024",
    "discount_type": "percentage" | "fixed",
    "discount_value": 20,
    "discount_amount": 1198  // cantidad a descontar
  }
}

Response (error):
{
  "valid": false,
  "error": "Este cupón ha expirado"
}
```

### 2. **Crear Orden con Cupón**
```
POST /api/orders/create

Request:
{
  "items": [...],
  "total": 5990,
  "couponId": "uuid",        // ID del cupón validado
  "discountAmount": 1198,    // Monto descuento
  "shippingAddress": {...}
}

Response:
{
  "success": true,
  "order_id": "uuid"
}

Acciones internas:
1. Crear orden en DB
2. Incrementar current_uses del cupón
3. Insertar registro en coupon_usage (con user_id, discount_applied)
```

### 3. **Admin: Ver Uso de Cupones**
```
GET /api/admin/coupons-usage
(Requiere autenticación admin)

Response:
{
  "success": true,
  "coupons": [
    {
      "id": "uuid",
      "code": "SUMMER2024",
      "discount_type": "percentage",
      "discount_value": 20,
      "max_uses": 100,
      "current_uses": 45,
      "is_active": true,
      "valid_from": "2024-06-01T00:00:00Z",
      "valid_until": "2024-08-31T23:59:59Z",
      "usage": [
        {
          "id": "uuid",
          "user_id": "uuid",
          "order_id": "uuid",
          "discount_applied": 1198,
          "created_at": "2024-06-15T10:30:00Z"
        }
      ],
      "total_discount_amount": 53910,  // total descuentado
      "usage_count": 45
    }
  ]
}
```

### 4. **Admin Dashboard: Uso de Cupones**
```
URL: /admin/cupones/uso

Funcionalidades:
- Estadísticas globales (cupones activos, total usos, descuento total)
- Tabla con todos los cupones
- Detalles de uso por cupón (barra de progreso, usuarios, montos)
- Estado (Activo/Expirado/Inactivo)
- Rango de fechas de vigencia
```

---

## 🎨 Interfaz de Usuario

### Carrito (`src/pages/carrito.astro`)

**Sin cupón:**
```
┌─────────────────────────┐
│ Código de Descuento     │
│ [Input: Ingresa código] │
│ [Botón: Aplicar Código] │
│                         │
│ ❌ Error (rojo)         │ ← Si hay error
│ ✓ Éxito (verde)         │ ← Si es éxito
└─────────────────────────┘
```

**Con cupón aplicado:**
```
┌─────────────────────────┐
│ ✓ Descuento aplicado    │
│ 🎟️ SUMMER2024           │
│ [Remover]               │
└─────────────────────────┘
```

**Resumen:**
```
Subtotal:          €59.90
Descuento:        -€11.98
────────────────────────
Total:             €47.92
```

### Checkout (`src/components/checkout/CheckoutFlow.tsx`)

**Sección de cupón:**
- Input con auto-uppercase
- Botón con estado "Validando..." durante fetch
- Mensaje de error con fondo rojo
- Mensaje de éxito con fondo verde (auto-desaparece en 5s)
- Cuadro verde cuando cupón está aplicado

---

## 🔄 Cálculo de Descuento

**Función:** `src/lib/coupons.ts` → `calculateDiscount()`

```typescript
// Descuento Fijo: €10 de descuento
if (discount_type === 'fixed') {
  return Math.min(discount_value, totalAmount)
}

// Descuento Porcentaje: 20% de descuento
// Máximo: €50 de descuento
let discount = (totalAmount * discount_value) / 100
if (max_discount_amount) {
  discount = Math.min(discount, max_discount_amount)
}
return Math.round(discount)  // Redondear a centavos
```

---

## 📊 Tracking de Uso de Cupones

### Tabla: `coupon_usage`
```sql
id              UUID PRIMARY KEY
coupon_id       UUID (FK → coupons)
order_id        UUID (FK → orders)
user_id         UUID (FK → auth.users, nullable para guests)
discount_applied INTEGER (centavos)
created_at      TIMESTAMP
```

### Actualización de Contador
```typescript
// Antes de usar cupón:
coupons.current_uses = 45

// Después de usar:
coupons.current_uses = 46  ← Incrementado

// Se registra en coupon_usage:
{
  coupon_id: "uuid",
  order_id: "uuid-nueva-orden",
  user_id: "uuid-usuario" | null,
  discount_applied: 1198,  // monto real descuento
  created_at: NOW()
}
```

---

## 🚨 Manejo de Errores

### Errores en Validación (cliente vé mensaje específico)
- ❌ Código incorrecto
- ❌ Cupón no activo
- ❌ Cupón no comenzó aún
- ❌ Cupón expirado
- ❌ Límite de usos alcanzado
- ❌ Compra mínima no alcanzada
- ❌ Error de conexión

### Errores en Creación de Orden
- ✅ Orden se crea correctamente
- ⚠️ Si falla registro de uso de cupón:
  - Se loguea en servidor
  - No falla la orden
  - Se intenta registrar el uso de todas formas

### Console Logs
```
[Coupon] Validation error: {error}
[Coupon] Usage recorded successfully: {couponId, orderId, userId}
[Order API] Coupon usage registered successfully
[Order API] Failed to register coupon usage: {error}
[Success Page] Cleared cart and coupon
[Success Page] Coupon was applied: {coupon.code}
```

---

## 🔒 Seguridad

### Validaciones de Seguridad
1. ✅ Validación server-side (NO confiar en cliente)
2. ✅ Cupones con fechas de expiración
3. ✅ Límites de usos (máximo global)
4. ✅ Separated Admin/User authentication
5. ✅ Admin endpoint requiere role='admin'
6. ✅ User ID verificado en server

### Pendiente (Opcional)
- [ ] Rate limiting en validación de cupones
- [ ] Límite de intentos fallidos
- [ ] Validación de cupón único por orden
- [ ] Límite de cupones por usuario (actual: ilimitado)

---

## 📱 Flujo Completo Usuario

### 1. Carrito
```
Usuario ve carrito → Input cupón → Hace click "Aplicar"
↓
Validación server-side (8 checks)
↓
Si ERROR: Muestra mensaje rojo con razón específica
Si VÁLIDO: Muestra ✓ cupón aplicado, recalcula total
```

### 2. Checkout
```
Resumen muestra cupón aplicado y descuento
Usuario confirma + va a Stripe
↓
Sistema crea orden + registra uso de cupón
↓
Stripe procesa pago
↓
Redirección a /checkout/success
↓
localStorage se limpia (cupón + carrito)
```

### 3. Admin
```
Admin accede a /admin/cupones/uso
↓
Ve estadísticas: cupones activos, total usos, descuento total
↓
Tabla detallada de cada cupón:
  - Código
  - Tipo descuento
  - Vigencia
  - Usos (con barra de progreso)
  - Descuento total aplicado
  - Estado
```

---

## 🛠️ Mejoras Realizadas

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Validación** | 5 checks | 8 checks + error specifics |
| **Mensajes** | Genéricos | Específicos con contexto |
| **Success UX** | Silencioso | Mensaje con monto descuento |
| **Loading** | No visible | "Validando..." en botón |
| **Errors** | Text rojo simple | Box rojo con padding |
| **Admin tracking** | No existe | Dashboard completo |
| **Usage logging** | Try-catch silencioso | Proper error handling |
| **User feedback** | Alerts | Mensajes integrados |

---

## 📝 Testing Recomendado

### Casos de Prueba Básicos
- [ ] Aplicar cupón válido en carrito
- [ ] Cupón inválido muestra error
- [ ] Cupón expirado muestra "Ha expirado"
- [ ] Cupón sin stock muestra "Límite de usos"
- [ ] Compra bajo mínimo muestra requerimiento
- [ ] Remover cupón actualiza total
- [ ] Descuento se aplica en checkout
- [ ] Orden se crea y uso se registra
- [ ] Success page limpia carrito

### Casos Edge
- [ ] Código con mayúsculas/minúsculas
- [ ] Multiple cupones (solo el último aplica)
- [ ] Cupón con descuento > total carrito (capped)
- [ ] Usuario logged in y guest (ambos funcionan)
- [ ] Admin puede ver todos los usos

### Admin
- [ ] Dashboard carga sin errores
- [ ] Estadísticas se calculan correctamente
- [ ] Tabla muestra todos los cupones
- [ ] Barra de progreso calcula %

---

## 🚀 Próximos Pasos (Opcional)

1. **Histórico de uso por usuario**
   - Crear página `/mi-cuenta/cupones-usados`
   - Mostrar cupones aplicados en mis pedidos

2. **Promociones por categoría**
   - Cupones solo válidos para ciertos productos
   - Validar product IDs antes de aplicar

3. **Cupones automáticos**
   - Aplicar automáticamente en checkout si usuario califica
   - Mostrar cupones sugeridos

4. **Analytics avanzados**
   - Gráficos de uso por fecha
   - Cupones más populares
   - ROI por campaña

5. **A/B Testing**
   - Test diferentes textos/mensajes
   - Test diferentes porcentajes

---

## 📞 Soporte

**Si algo no funciona:**
1. Revisa browser console para errores
2. Revisa server logs en `/src` o Coolify
3. Verifica datos en Supabase (coupons, coupon_usage)
4. Confirma fechas (valid_from, valid_until)
5. Revisa que cupón tenga is_active = true

**Logs importantes:**
- `[Coupon]` - Validación y uso
- `[Order API]` - Creación de orden
- `[Success Page]` - Limpieza post-pago
- `[Admin Coupons Usage API]` - Admin dashboard

---

**Ultima actualización:** 2024
**Estado:** ✅ Sistema completo y listo para producción
