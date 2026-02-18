# Sistema de Reembolsos con Stripe

## Descripción

Este sistema permite a los administradores procesar reembolsos a través de Stripe directamente desde el panel de administración. El reembolso se procesa simultáneamente en Stripe y en la base de datos local.

## Flujo de Reembolso

```
Admin request refund
    ↓
Validar permisos de admin
    ↓
Obtener detalles del pedido
    ↓
Procesar reembolso en Stripe API
    ↓
Actualizar estado en BD (RPC: admin_process_return)
    ↓
Registrar en refunds_log (auditoría)
    ↓
Enviar email de confirmación al cliente
```

## API Endpoint

### POST `/api/admin/process-refund`

**Autenticación**: Requiere cookie de sesión y permisos de admin

**Body**:
```json
{
  "orderId": "12345678-1234-1234-1234-123456789012",
  "notes": "Reembolso solicitado por cliente - problema de calidad (opcional)"
}
```

**Response (Éxito)**:
```json
{
  "success": true,
  "message": "Reembolso procesado exitosamente",
  "data": {
    "order_id": "12345678-1234-1234-1234-123456789012",
    "stripe_refund_id": "re_1234567890",
    "amount": 99.99,
    "status": "refunded"
  }
}
```

**Response (Error)**:
```json
{
  "success": false,
  "message": "Descripción del error"
}
```

## Estados HTTP

- `200`: Reembolso procesado exitosamente
- `400`: Datos inválidos (falta orderId, sin payment intent)
- `401`: No autenticado
- `403`: No es administrador
- `404`: Pedido no encontrado
- `500`: Error en Stripe o en la BD

## Validaciones

1. **Autenticación**: Requiere sesión activa
2. **Permisos**: Solo administradores pueden procesar reembolsos
3. **Pedido existente**: El pedido debe existir en la BD
4. **Payment Intent**: El pedido debe tener `stripe_payment_intent_id` registrado
5. **Monto**: Se reembolsa el monto total del pedido

## Tablas Involucradas

### `orders`
- Actualiza `status = 'refunded'`
- Registra `stripe_payment_intent_id`

### `order_status_history`
- Inserta registro con cambio de estado
- Incluye nota del reembolso y ID de refund de Stripe

### `refunds_log` (Nueva tabla)
- Registro de auditoría de todos los reembolsos
- Almacena ID de Stripe para correlación
- Registra admin y timestamp

## Email de Confirmación

Se envía automáticamente al cliente con:
- ✓ Confirmación del reembolso
- ✓ Número de pedido
- ✓ Monto reembolsado
- ✓ Fecha de procesamiento

## Manejo de Errores

| Error | Manejo |
|-------|--------|
| Payment Intent no encontrado | Retorna error 400 |
| Stripe API error | Retorna error 500 con mensaje de Stripe |
| RPC error | Retorna error 500, intenta registrar en auditoría |
| Email failure | Continúa (log pero no bloquea) |

## Consideraciones Importantes

1. **Reembolso Atomicidad**: Stripe se procesa PRIMERO. Si falla, RPC no se ejecuta.
2. **Restauración de Stock**: NO restaura inventario (esto es un reembolso, no una devolución)
3. **Persistencia**: El `stripe_refund_id` se guarda en notas para auditoría completa
4. **Idempotencia**: No puedes reembolsar dos veces el mismo pedido (estado bloqueará)

## Integración con Admin UI

El botón de reembolso debe:
1. Mostrar solo si estado = 'returned' o 'refunded' (pendiente)
2. Pedir confirmación antes de procesar
3. Mostrar campo opcional para notas
4. Mostrar spinner mientras procesa
5. Mostrar notificación de éxito/error

## Próximos Pasos

- [ ] Agregar UI button en AdminOrderActions.tsx
- [ ] Agregar tabla refunds_log en Supabase
- [ ] Agregar validación de estado de pedido válido para reembolso
- [ ] Agregar soporte para reembolsos parciales
- [ ] Agregar log de intentos fallidos

## Testing

```bash
# Test con curl
curl -X POST http://localhost:3000/api/admin/process-refund \
  -H "Content-Type: application/json" \
  -H "Cookie: [sesión admin]" \
  -d '{
    "orderId": "12345678-1234-1234-1234-123456789012",
    "notes": "Reembolso de prueba"
  }'
```
