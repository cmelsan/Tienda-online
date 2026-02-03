# 🎉 Sistema de Email de Bienvenida con Descuento

## 📋 Resumen

Cuando un usuario se registra en el sitio, automáticamente recibe un email con:
- ✅ Mensaje de bienvenida personalizado
- ✅ Código de descuento: **BIENVENIDO20** (20% de descuento)
- ✅ Beneficios de tener cuenta
- ✅ Link a explorar productos

## 🔧 Cómo Funciona

### 1. **Usuario se registra**
- Va a `/registro`
- Completa nombre, email y contraseña
- Hace clic en "Crear Cuenta"

### 2. **Sistema automáticamente:**
- Crea la cuenta en Supabase Auth
- Migra el carrito (si es guest)
- **Envía email de bienvenida** ← NUEVO

### 3. **Email de Bienvenida**
- Template profesional en `/src/lib/brevo.ts` → `getWelcomeTemplate()`
- Endpoint en `/src/pages/api/emails/welcome.ts`
- Contiene el código BIENVENIDO20 destacado

## 📝 Customizaciones

### Cambiar el código de descuento
En `/src/pages/registro.astro`, línea ~120:
```typescript
discountCode: 'BIENVENIDO20',  // ← Cambia aquí
discountPercentage: 20         // ← y aquí
```

### Cambiar el porcentaje de descuento
Mismo lugar que arriba

### Cambiar el texto del email
En `/src/lib/brevo.ts`, función `getWelcomeTemplate()` líneas ~327-380

## ✅ Admin: Crear el Cupón

1. Ve a `/admin` (panel administrativo)
2. Sección de "Coupons" o "Códigos de Descuento"
3. Crear nuevo cupón:
   - **Código**: BIENVENIDO20
   - **Tipo**: Porcentaje (%)
   - **Valor**: 20
   - **Válido para**: Primera compra (opcional)
   - **Válido desde**: HOY
   - **Válido hasta**: [fecha que definas]

## 📊 Newsletter + Email de Bienvenida

El usuario automáticamente:
1. ✅ Recibe email de bienvenida (registro)
2. ✅ Puede suscribirse a newsletter (footer)

Son dos sistemas independientes pero complementarios.

## 🧪 Testear

### En Desarrollo
```javascript
// En consola del navegador
fetch('/api/emails/welcome', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'tu@email.com',
    userName: 'Test User',
    discountCode: 'BIENVENIDO20',
    discountPercentage: 20
  })
}).then(r => r.json()).then(console.log)
```

## 📧 Email Template Features

- ✨ Diseño responsive
- 🎨 Gradient header (pink y orange)
- 🎟️ Código de descuento destacado
- 📋 Lista de beneficios
- 🛍️ Button CTA a productos
- 📱 Mobile-friendly

## 🔐 Variables Seguras

El endpoint espera:
- `email` - email del usuario
- `userName` - nombre para personalizar
- `discountCode` - código (default: BIENVENIDO20)
- `discountPercentage` - % de descuento (default: 20)

## 📞 Soporte

Si los emails no se envían:
1. Verificar que BREVO_API_KEY está configurada en `.env`
2. Revisar logs en app.brevo.com
3. Chequear la consola del navegador
4. Verificar que el usuario confirmó su email en Supabase
