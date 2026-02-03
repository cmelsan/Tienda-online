# 🎉 Sistema de Email de Bienvenida con Descuento

## 📋 Resumen

Cuando un usuario se registra o se suscribe a la newsletter, automáticamente recibe un email con:
- ✅ Mensaje de bienvenida personalizado
- ✅ Código de descuento: **BIENVENIDO20** (20% de descuento)
- ✅ Beneficios específicos según el tipo de registro
- ✅ Link a explorar productos

## 🔧 Cómo Funciona

### 1️⃣ **Usuario se registra como miembro** (`/registro`)
- Va a `/registro`
- Completa nombre, email y contraseña
- Hace clic en "Crear Cuenta"
- **Recibe:** Email de bienvenida completo con cupón BIENVENIDO20 (20%)

### 2️⃣ **Usuario se suscribe a newsletter** (footer)
- Va al footer del sitio
- Ingresa su email
- Hace clic en "Suscribirse"
- **Recibe:** Email de bienvenida para suscriptores con cupón BIENVENIDO20 (20%)

### 3️⃣ **Sistema automáticamente:**
- Guarda el email en la BD
- Envía email de bienvenida personalizado
- Incluye el código BIENVENIDO20

## 📊 Diferencias entre tipos de email

| Aspecto | Registro de Usuario | Newsletter |
|--------|-------------------|-----------|
| **Plantilla** | `getWelcomeTemplate()` | `getNewsletterWelcomeTemplate()` |
| **Cupón** | BIENVENIDO20 | NEWSLETTER10 |
| **Descuento** | 20% | 10% |
| **Beneficios** | Cuenta completa | Suscripción newsletter |
| **Válido para** | Primera compra | Próxima compra |

## 📝 Customizaciones

### Cambiar el código de descuento

**Para Registro** (`/src/pages/registro.astro`):
```typescript
discountCode: 'BIENVENIDO20',  // ← Cambia aquí
discountPercentage: 20         // ← y aquí
```

**Para Newsletter** (`/src/pages/api/newsletter.ts`):
```typescript
const htmlContent = getNewsletterWelcomeTemplate(email, 'NEWSLETTER10', 10);
                                                        ^^^^^^^^^^^^^ ^^
                                                        código   descuento %
```

### Cambiar el texto del email

**Registro:**
En `/src/lib/brevo.ts`, función `getWelcomeTemplate()` líneas ~327-380

**Newsletter:**
En `/src/lib/brevo.ts`, función `getNewsletterWelcomeTemplate()` líneas ~323-380

## ✅ Admin: Crear el Cupón

1. Ve a `/admin` (panel administrativo)
2. Sección de "Coupons" o "Códigos de Descuento"
3. Crear nuevo cupón:
   - **Código**: BIENVENIDO20
   - **Tipo**: Porcentaje (%)
   - **Valor**: 20
   - **Válido para**: Todos o Primera compra (opcional)
   - **Válido desde**: HOY
   - **Válido hasta**: [fecha que definas]

## 🧪 Testear

### En Consola del Navegador

**Email de Bienvenida (Registro):**
```javascript
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

**Email de Newsletter:**
```javascript
fetch('/api/newsletter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@email.com'
  })
}).then(r => r.json()).then(console.log)
```

## 📧 Email Template Features

- ✨ Diseño responsive idéntico
- 🎨 Gradient header (pink y orange)
- 🎟️ Código de descuento destacado
- 📋 Lista de beneficios (personalizado para cada tipo)
- 🛍️ Button CTA a productos
- 📱 Mobile-friendly

## 🔐 Variables Seguras

**Endpoint Welcome (Registro):**
- `email` - email del usuario
- `userName` - nombre para personalizar
- `discountCode` - código (default: BIENVENIDO20)
- `discountPercentage` - % de descuento (default: 20)

**Endpoint Newsletter:**
- `email` - email del suscriptor
- Automáticamente usa BIENVENIDO20 (20%)

## 📞 Soporte

Si los emails no se envían:
1. Verificar que BREVO_API_KEY está configurada en `.env`
2. Revisar logs en app.brevo.com
3. Chequear la consola del navegador
4. Verificar que el usuario confirmó su email en Supabase (si aplica)

