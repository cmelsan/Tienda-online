# 📧 Sistema de Notificaciones por Email con Brevo

## Configuración Inicial

### 1. Obtener API Key de Brevo

1. Ir a [app.brevo.com](https://app.brevo.com)
2. Crear cuenta o iniciar sesión
3. Ir a **Account → SMTP & API**
4. Hacer clic en **Create API Key**
5. Copiar la key generada

### 2. Configurar Variables de Entorno

En el archivo `.env`:

```env
BREVO_API_KEY=xkeysib_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@eclatbeauty.com
FROM_NAME=ÉCLAT Beauty
```

## Endpoints Disponibles

### 1. Confirmación de Email
**POST** `/api/emails/confirmation`

```javascript
fetch('/api/emails/confirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    userName: 'María',
    confirmUrl: 'https://eclatbeauty.com/verify?token=abc123'
  })
})
```

**Respuesta:**
```json
{
  "success": true,
  "messageId": "1234567890"
}
```

### 2. Confirmación de Pedido
**POST** `/api/emails/order-confirmation`

```javascript
fetch('/api/emails/order-confirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    customerName: 'María',
    orderNumber: 'ECO-2026-001',
    items: [
      { name: 'Sombra Rosa', quantity: 1, price: 2500 },
      { name: 'Labial Rojo', quantity: 2, price: 1800 }
    ],
    total: 5000 // en céntimos (50.00€)
  })
})
```

### 3. Notificación de Envío
**POST** `/api/emails/shipping-notification`

```javascript
fetch('/api/emails/shipping-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    customerName: 'María',
    trackingNumber: 'TRACK-2026-12345',
    trackingUrl: 'https://tracking.carrier.com/TRACK-2026-12345'
  })
})
```

### 4. Devolución Aprobada
**POST** `/api/emails/return-approved`

```javascript
fetch('/api/emails/return-approved', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    customerName: 'María',
    returnNumber: 'RET-2026-001',
    shippingLabel: true // opcional
  })
})
```

### 5. Restablecer Contraseña
**POST** `/api/emails/password-reset`

```javascript
fetch('/api/emails/password-reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    userName: 'María',
    resetUrl: 'https://eclatbeauty.com/reset?token=xyz789'
  })
})
```

### 6. Newsletter
**POST** `/api/emails/newsletter`

```javascript
fetch('/api/emails/newsletter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    unsubscribeUrl: 'https://eclatbeauty.com/unsubscribe?token=abc',
    subject: '🎉 Nuevo: Colecciones de Primavera',
    content: '<h2>¡Descubre nuestras nuevas colecciones!</h2><p>Hasta 30% de descuento...</p>'
  })
})
```

### 7. Email Personalizado (Genérico)
**POST** `/api/emails/send`

```javascript
fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: ['user@example.com', 'other@example.com'], // array o string
    subject: 'Tu asunto aquí',
    htmlContent: '<h1>Contenido HTML</h1><p>Aquí va tu mensaje...</p>',
    textContent: 'Contenido en texto plano (opcional)',
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'],
    replyTo: 'support@eclatbeauty.com'
  })
})
```

## Plantillas HTML Disponibles

El sistema incluye plantillas profesionales preconfiguradas para:

### `getEmailConfirmationTemplate(confirmUrl, userName)`
- Tema: Confirmación de registro
- Diseño: Gradient header, botón CTA, enlace alternativo
- Variables: URL de confirmación, nombre de usuario

### `getOrderConfirmationTemplate(orderNumber, customerName, items, total)`
- Tema: Confirmación de pedido
- Diseño: Tabla de items, resumen de total
- Variables: Número de orden, nombre, items (array), total

### `getShippingNotificationTemplate(customerName, trackingNumber, trackingUrl)`
- Tema: Notificación de envío
- Diseño: Número de seguimiento destacado, botón de tracking
- Variables: Nombre, número de seguimiento, URL de tracking

### `getReturnApprovedTemplate(customerName, returnNumber, shippingLabel)`
- Tema: Devolución aprobada
- Diseño: Instrucciones paso a paso
- Variables: Nombre, número de devolución, etiqueta de envío (opcional)

### `getPasswordResetTemplate(resetUrl, userName)`
- Tema: Restablecer contraseña
- Diseño: Advertencia de seguridad, enlace con expiración
- Variables: URL de reset, nombre de usuario

### `getNewsletterTemplate(unsubscribeUrl, content)`
- Tema: Newsletter genérico
- Diseño: Flexible, soporta HTML personalizado
- Variables: URL de desuscripción, contenido HTML

## Integración con Flujos Existentes

### En Registro de Usuario
```typescript
// En src/pages/api/auth/signin.ts
import { sendEmail, getEmailConfirmationTemplate } from '@/lib/brevo';

const confirmUrl = `${PUBLIC_SITE_URL}/verify?token=${token}`;
const htmlContent = getEmailConfirmationTemplate(confirmUrl, userName);

await sendEmail({
  to: email,
  subject: '✉️ Confirma tu email en ÉCLAT Beauty',
  htmlContent
});
```

### En Creación de Pedido
```typescript
// En src/pages/api/orders/create.ts
import { sendEmail, getOrderConfirmationTemplate } from '@/lib/brevo';

const htmlContent = getOrderConfirmationTemplate(
  orderNumber,
  customerName,
  orderItems,
  orderTotal
);

await sendEmail({
  to: customerEmail,
  subject: `📦 Pedido confirmado #${orderNumber}`,
  htmlContent
});
```

### En Devolución Aprobada
```typescript
// En src/pages/api/orders/return.ts
import { sendEmail, getReturnApprovedTemplate } from '@/lib/brevo';

const htmlContent = getReturnApprovedTemplate(
  customerName,
  returnNumber
);

await sendEmail({
  to: customerEmail,
  subject: `✓ Devolución aprobada #${returnNumber}`,
  htmlContent
});
```

## Buenas Prácticas

1. **Gestión de Errores**: Siempre maneja los casos donde Brevo no está disponible
   ```typescript
   const result = await sendEmail({...});
   if (!result.success) {
     console.error('Email no enviado:', result.error);
     // Registrar error pero no bloquear la operación
   }
   ```

2. **Logging**: Registra los IDs de mensaje para seguimiento
   ```typescript
   console.log(`Email enviado: ${result.messageId}`);
   ```

3. **Variables de Entorno**: Nunca hardcodees valores
   ```typescript
   const fromEmail = process.env.FROM_EMAIL;
   const apiKey = process.env.BREVO_API_KEY;
   ```

4. **Rate Limiting**: Brevo permite ~300 emails/minuto
   - Agrupa newsletters en lotes
   - Implementa colas para envíos masivos

5. **Validación**: Verifica emails válidos antes de enviar
   ```typescript
   if (!email || !email.includes('@')) {
     return { success: false, error: 'Email inválido' };
   }
   ```

## Monitoreo y Debugging

### Ver Logs de Brevo
1. Login en [app.brevo.com](https://app.brevo.com)
2. Ir a **Reporting → Activity & Logs**
3. Filtrar por fecha, asunto, etc.

### Probar Localmente
```bash
# En la consola del navegador:
fetch('/api/emails/confirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'tu-email@example.com',
    userName: 'Test User',
    confirmUrl: 'https://example.com/verify'
  })
}).then(r => r.json()).then(console.log)
```

## Solución de Problemas

### "Email service not configured"
- Verificar que `BREVO_API_KEY` está en `.env`
- Comprobar que la key no tiene espacios extras

### "Invalid API Key"
- Ir a Brevo y regenerar la key
- Copiar la key completa sin espacios

### Emails no llegan a inbox
- Revisar carpeta de spam/basura
- Verificar que el FROM_EMAIL está verificado en Brevo
- Comprobar los logs de actividad en Brevo

### Error 429 (Rate Limit)
- Brevo rechaza >300 emails/minuto
- Implementar cola o delay entre envíos masivos
- Usar segmentación en lugar de envíos individuales

## Estado Actual

✅ Servicio de email integrado con Brevo
✅ 6 plantillas profesionales preconfiguradas
✅ Endpoint genérico para emails personalizados
✅ Manejo completo de errores
✅ Listo para integración en flujos existentes
