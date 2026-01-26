# 🎟️ GUÍA RÁPIDA - Sistema de Cupones

## 📍 Ubicación de Archivos Principales

```
Sistema de Cupones
├── 📁 Backend/Lógica
│   ├── src/lib/coupons.ts ..................... Validación y cálculo
│   ├── src/pages/api/checkout/validate-coupon.ts ... Endpoint validación
│   ├── src/pages/api/orders/create.ts ........ Crear orden + registrar uso
│   └── src/pages/api/admin/coupons-usage.ts . Admin data (NUEVO)
│
├── 📁 Frontend/UI
│   ├── src/pages/carrito.astro ............... Input y validación
│   ├── src/components/checkout/CheckoutFlow.tsx ... Checkout
│   ├── src/pages/checkout/success.astro ..... Post-pago
│   └── src/pages/admin/cupones/uso.astro ... Dashboard admin (NUEVO)
│
├── 📁 Store
│   └── src/stores/cart.ts ................... appliedCoupon state
│
└── 📁 Docs
    ├── COUPON_SYSTEM.md ..................... Documentación completa
    └── COUPON_IMPROVEMENTS_SUMMARY.md ...... Resumen cambios
```

---

## 🔑 Funciones Clave

### Validación
```typescript
import { validateCoupon, calculateDiscount } from '@/lib/coupons';

const result = await validateCoupon(code, totalAmount, userId?);
// { valid: true/false, coupon?: {...}, error?: string }

const discount = calculateDiscount(coupon, totalAmount);
// número en centavos
```

### Registrar Uso
```typescript
import { incrementCouponUsage } from '@/lib/coupons';

await incrementCouponUsage(couponId, orderId, userId, discountAmount);
// throws error si falla
```

---

## ⚡ Flujos Rápidos

### Aplicar Cupón (Usuario)
```
Input: code="SUMMER"
       ↓
POST /api/checkout/validate-coupon
       ↓
Respuesta: { valid: true, coupon: {...} }
       ↓
applyCoupon() store update
       ↓
UI: "✓ Cupón SUMMER aplicado: €11.98"
```

### Crear Orden con Cupón
```
POST /api/orders/create {
  couponId: "uuid",
  discountAmount: 1198
}
       ↓
Crea orden
       ↓
incrementCouponUsage()
  - current_uses++
  - insert coupon_usage
       ↓
Respuesta: { success: true, order_id: "uuid" }
```

### Ver Uso (Admin)
```
GET /api/admin/coupons-usage
       ↓
Retorna array de coupons con:
  - usage: array de registros
  - total_discount_amount
  - usage_count
       ↓
Dashboard en /admin/cupones/uso
```

---

## 🎯 Validaciones (8 Puntos)

1. **Código no vacío** → "Debes ingresar un código"
2. **Monto > 0** → "El monto debe ser > 0"
3. **Código existe** → "Código inválido o no existe"
4. **Activo** → "Cupón no disponible"
5. **Fecha inicio** → "Será válido desde [fecha]"
6. **Fecha fin** → "Expiró el [fecha]"
7. **Límite usos** → "Límite alcanzado (N/Max)"
8. **Compra mínima** → "Mínimo €X (tienes €Y)"

---

## 🧪 Testing Rápido

### Prueba 1: Cupón Válido
```bash
curl -X POST http://localhost:4321/api/checkout/validate-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"SUMMER","totalAmount":5990}'

# Esperado: { "valid": true, "coupon": {...}, "discount_amount": 1198 }
```

### Prueba 2: Cupón Expirado
```bash
curl -X POST http://localhost:4321/api/checkout/validate-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"OLD","totalAmount":5990}'

# Esperado: { "valid": false, "error": "Este cupón expiró el 31/12/2023" }
```

### Prueba 3: Admin Dashboard
```
Visitar: http://localhost:4321/admin/cupones/uso
Esperar: Tabla con cupones y estadísticas
```

---

## 📊 Estado del Cupón

```sql
-- Ver cupones activos
SELECT code, current_uses, max_uses, is_active
FROM coupons
WHERE is_active = true AND valid_until > NOW();

-- Ver uso por cupón
SELECT coupon_id, COUNT(*) as uses, SUM(discount_applied) as total
FROM coupon_usage
GROUP BY coupon_id;

-- Ver uso por usuario
SELECT user_id, COUNT(*) as uses, SUM(discount_applied) as total
FROM coupon_usage
WHERE user_id IS NOT NULL
GROUP BY user_id;
```

---

## 🐛 Debugging

### Console Logs Principales
```
[Coupon] Validation error: ...
[Coupon] Usage recorded successfully: { couponId, orderId, userId }
[Order API] Coupon usage registered successfully
[Order API] Failed to register coupon usage: ...
[Success Page] Coupon was applied: SUMMER
```

### Checks Rápidos
- [ ] Cupón existe en BD: `SELECT * FROM coupons WHERE code='SUMMER'`
- [ ] Cupón está activo: `is_active = true`
- [ ] Cupón no expiró: `valid_until > NOW()`
- [ ] Usos no alcanzados: `current_uses < max_uses`
- [ ] Monto cumple: `totalAmount >= min_purchase_amount`

### Errores Comunes
| Error | Causa | Fix |
|-------|-------|-----|
| "Código inválido" | Cupón no existe | Verificar nombre exacto |
| "Ha expirado" | valid_until pasado | Actualizar fecha o marcar inactivo |
| "Límite alcanzado" | current_uses >= max_uses | Incrementar max_uses |
| "Compra mínima" | totalAmount bajo | Aumentar cantidad o bajar mínimo |
| Orden sin cupón | couponId null | Verificar que se pasa en request |

---

## 🔄 Flujo Completo Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO EN CARRITO                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Input: Ingresa cupón] [Botón: Aplicar]                    │
│                                                              │
│  ↓ Click Aplicar                                             │
│                                                              │
│  POST /api/checkout/validate-coupon                          │
│  { code: "SUMMER", totalAmount: 5990 }                       │
│                                                              │
│  ↓ Validación (8 checks)                                     │
│                                                              │
│  Response: { valid: true, coupon: {...} }                    │
│                                                              │
│  ↓ applyCoupon() store update                                │
│                                                              │
│  ✓ "Cupón SUMMER aplicado: €11.98"                           │
│  [Resumen actualizado con descuento]                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   USUARIO EN CHECKOUT                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Resumen muestra:                                            │
│  - Cupón: SUMMER                                             │
│  - Descuento: -€11.98                                        │
│  - Total: €47.92                                             │
│                                                              │
│  [Botón: Continuar a Pago Stripe]                            │
│                                                              │
│  ↓ Click Continuar                                           │
│                                                              │
│  POST /api/orders/create                                     │
│  { items: [...], couponId: "uuid", discountAmount: 1198 }   │
│                                                              │
│  ↓ Create order in DB                                        │
│  ↓ incrementCouponUsage()                                    │
│    - current_uses++                                          │
│    - insert coupon_usage record                              │
│                                                              │
│  Response: { success: true, order_id: "uuid" }              │
│                                                              │
│  ↓ Redirect a Stripe...                                      │
│  ↓ Stripe procesa pago...                                    │
│  ↓ Webhook confirma pago...                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   PÁGINA DE ÉXITO                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  localStorage.removeItem('eclat-coupon:')                    │
│  localStorage.removeItem('eclat-cart:')                      │
│                                                              │
│  ✓ ¡Gracias por tu compra!                                   │
│  Pedido #12345678                                            │
│  Email enviado a customer@example.com                        │
│                                                              │
│  [Botón: Volver a la tienda]                                 │
│  [Botón: Ver mis pedidos]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  ADMIN DASHBOARD                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /admin/cupones/uso                                          │
│                                                              │
│  📊 Estadísticas:                                            │
│  • Cupones Activos: 5                                        │
│  • Total Cupones: 10                                         │
│  • Total Usos: 120                                           │
│  • Descuento Total: €450.00                                  │
│                                                              │
│  📋 Tabla:                                                   │
│  SUMMER | 20% | Jun-Ago 24 | 45/100 | €450 | Activo         │
│  FALL   | €10 | Sep-Nov 24 | 75/... | €750 | Activo         │
│  WINTER | 30% | Dic-Feb 24 |  0/50  | €0   | Expirado       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Checklist de Implementación

- [x] Validación con 8 checks
- [x] Mensajes de error específicos
- [x] Mensajes de éxito integrados
- [x] Loading states
- [x] Incrementar coupon usage
- [x] Registrar en coupon_usage
- [x] Limpiar después de pago
- [x] Admin endpoint
- [x] Admin dashboard
- [x] Documentación completa

---

## 📞 URLs Principales

| Funcionalidad | URL | Method |
|---|---|---|
| Validar cupón | `/api/checkout/validate-coupon` | POST |
| Crear orden | `/api/orders/create` | POST |
| Admin data | `/api/admin/coupons-usage` | GET |
| Carrito | `/carrito` | GET |
| Checkout | `/checkout` | GET |
| Éxito | `/checkout/success` | GET |
| Admin cupones | `/admin/cupones/uso` | GET |

---

## 🚀 Deploy

```bash
# Test local
npm run dev
# Visitar http://localhost:4321

# Build
npm run build

# Deploy a Coolify
# Push a main branch
# Coolify rebuild automático
```

---

**Última actualización:** 2024  
**Versión:** 1.0  
**Estado:** ✅ LISTO PARA PRODUCCIÓN
