## Diagnóstico: Newsletter No Llega Email

### ✅ Cambios Implementados

He mejorado el endpoint `src/pages/api/newsletter.ts` para:

1. **Verificar que BREVO_API_KEY esté configurado**
   - Si no está, retorna error inmediatamente
   - Error: "Servicio de email no configurado"

2. **Enviar email ANTES de guardar en BD**
   - Previousmente: guardaba en BD, luego enviaba email (si fallaba, se ignoraba)
   - Ahora: valida que el email se envíe primero
   - Solo si es exitoso, guarda en `newsletter_subscribers`

3. **Mejor logging**
   - Registra cada paso del proceso
   - Mensajes de error más descriptivos
   - Facilita debugging

### 🔍 Cómo Diagnosticar el Problema

Si un usuario se suscribe pero no recibe el email:

#### Opción 1: Revisar Logs en Coolify/Servidor
```
Busca en los logs por: "[Newsletter] Processing subscription"
Deberías ver algo como:
[Newsletter] Processing subscription for: usuario@email.com
[Newsletter] Sending welcome email...
[Newsletter] Email sent successfully, messageId: xxx
[Newsletter] Successfully subscribed: usuario@email.com
```

**Si ves un error, será una de estas:**
- `[Newsletter] ERROR: BREVO_API_KEY not configured!` → Las variables de entorno no están configuradas
- `[Newsletter] Failed to send welcome email: ...` → Error en la API de Brevo

#### Opción 2: Verificar Variables de Entorno en Coolify
Asegúrate de que estas estén configuradas:
```
BREVO_API_KEY = "tu-api-key-de-brevo"
FROM_EMAIL = "noreply@eclatbeauty.com" (o similar)
FROM_NAME = "ÉCLAT Beauty"
```

#### Opción 3: Probar Manualmente en Supabase
```sql
-- Ver si la suscripción se guardó
SELECT * FROM newsletter_subscribers WHERE email = 'usuario@email.com';

-- Ver el timestamp para confirmar cuándo se suscribió
SELECT email, subscribed_at, is_active FROM newsletter_subscribers 
ORDER BY subscribed_at DESC LIMIT 1;
```

### ⚠️ Posibles Causas de Falla

| Problema | Síntoma | Solución |
|----------|---------|----------|
| **API Key no configurado** | Error 500 al suscribirse | Configurar `BREVO_API_KEY` en variables de entorno |
| **Email no verificado en Brevo** | Email falla pero no da error claro | Verificar dominio en https://app.brevo.com |
| **Rate limit de Brevo** | Algunos emails llegan, otros no | Esperar o contactar con Brevo |
| **Correo en spam** | Usuario se suscribe pero no ve el email | Pedir que revise spam/promotions |
| **Email inválido** | Rechazo de Brevo | Validación más estricta en frontend |

### 📝 Cambios en el Código

**Archivo modificado:** `src/pages/api/newsletter.ts`

**Antes:**
```typescript
// Guardaba en BD SIN verificar que el email se enviara
const { error } = await supabase.from('newsletter_subscribers').insert({ email });

// Luego intentaba enviar email (ignoraba fallos)
try {
    await sendEmail(...);
    // Si fallaba, solo hacía console.warn
} catch (emailError) {
    console.warn('Non-blocking error');
}
return { status: 200 }; // Siempre exitoso ❌
```

**Ahora:**
```typescript
// Verifica que BREVO_API_KEY exista
if (!process.env.BREVO_API_KEY) return error;

// Envía email PRIMERO
const emailResult = await sendEmail(...);
if (!emailResult.success) return error; // Bloquea si falla ✓

// Solo DESPUÉS guarda en BD
const { error } = await supabase.from('newsletter_subscribers').insert({ email });
```

### 🚀 Próximos Pasos

1. **Commit y push a git**: Sube estos cambios
2. **Redeploy en Coolify**: Despliega la última versión
3. **Prueba de suscripción**: Intenta suscribirse con un nuevo email
4. **Revisa los logs**: Busca los mensajes `[Newsletter]` para diagnosticar

### 💡 Si Sigue Fallando

Si después de estos cambios sigue sin funcionar:

1. **Verificar en Supabase:**
   - ¿El email se guardó en `newsletter_subscribers`?
   - ¿El `subscribed_at` es reciente?

2. **Verificar en Brevo:**
   - ¿El API key es válido?
   - ¿El dominio está verificado?
   - ¿Hay límite de envíos alcanzado?

3. **Revisar logs del servidor:**
   - Buscar líneas que empiecen con `[Brevo]` para ver errores de API

---

**Actualizado:** 16 Feb 2026
