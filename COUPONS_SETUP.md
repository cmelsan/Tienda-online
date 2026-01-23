# 🎟️ Sistema de Cupones - Guía de Instalación

## Paso 1: Ejecutar la Migración de Base de Datos

Para que el sistema de cupones funcione, necesitas ejecutar la migración SQL en Supabase.

### Opción A: Usando Supabase Dashboard (Recomendado)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú izquierdo
4. Haz clic en **New Query**
5. Copia y pega el contenido del archivo `migrations_coupons.sql`
6. Haz clic en **Run** (o presiona Ctrl+Enter)

### Opción B: Usando Supabase CLI (si la tienes instalada)

```bash
supabase db push
```

## Paso 2: Verificar la Instalación

Después de ejecutar la migración, verifica que las tablas se crearon correctamente:

1. En Supabase Dashboard, ve a **Table Editor**
2. Deberías ver dos nuevas tablas:
   - `coupons` - Almacena los códigos de descuento
   - `coupon_usage` - Registra cuándo se usó cada cupón

## Funcionalidades del Sistema de Cupones

### Panel de Admin
- **URL**: `/admin/cupones`
- **Crear cupón**: `/admin/cupones/nuevo`
- **Editar cupón**: `/admin/cupones/editar/[id]`

### Tipo de Descuento
- **Porcentaje**: Define un descuento porcentual (0-100%)
  - Ejemplo: 20% de descuento en toda la compra
  - Puedes limitar el descuento máximo (ej: máx 50€)
  
- **Cantidad fija**: Define un monto fijo de descuento en euros
  - Ejemplo: 15€ de descuento

### Validaciones Incluidas
- ✅ Código único (case-insensitive)
- ✅ Fecha de validez (desde/hasta)
- ✅ Límite de usos (se puede dejar ilimitado)
- ✅ Compra mínima requerida
- ✅ Aplicable a categorías específicas (opcional)
- ✅ Descuento máximo para porcentajes
- ✅ Estado activo/inactivo

### Flujo de Usuario en el Checkout

1. El cliente añade productos al carrito
2. En la página de checkout, ve el campo "Código de Descuento"
3. Ingresa el código del cupón
4. El sistema valida:
   - Que el código existe y está activo
   - Que no ha expirado
   - Que está dentro del límite de usos
   - Que el monto de compra cumple con el mínimo
5. Si es válido, muestra el descuento en el resumen
6. El descuento se aplica al total final
7. Se registra el uso del cupón en la tabla `coupon_usage`

## Ejemplo de Creación de Cupón

### Cupón de Black Friday (20% off)
- **Código**: `BLACKFRIDAY20`
- **Tipo**: Porcentaje
- **Valor**: 20
- **Descuento máximo**: 100€
- **Compra mínima**: 50€
- **Fecha válida desde**: 2024-11-28
- **Fecha válida hasta**: 2024-11-29
- **Usos máximos**: 500

### Cupón de Bienvenida (15€ fijo)
- **Código**: `WELCOME15`
- **Tipo**: Cantidad fija
- **Valor**: 15
- **Compra mínima**: 30€
- **Válido indefinidamente** (dejar empty fecha hasta)
- **Usos máximos**: Ilimitado

## Notas Técnicas

- Los cupones se validan en `/api/checkout/validate-coupon`
- El uso se registra automáticamente al crear la orden
- Todos los cupones se guardan con comparación case-insensitive
- Los descuentos se aplican ANTES de procesar el pago con Stripe
- La tabla `coupon_usage` mantiene un registro completo de auditoría

## Solución de Problemas

### Error: "Las tablas no existen"
→ Verifica que ejecutaste la migración SQL correctamente

### El cupón no se aplica
→ Verifica que:
- El cupón está activo (is_active = true)
- La fecha actual está dentro del rango válido
- El monto de compra cumple con el mínimo
- No se ha alcanzado el límite de usos

### ¿Dónde ver estadísticas de cupones?
→ Ve a `/admin/cupones/editar/[id]` para ver:
- Cuántas veces se usó el cupón
- Cuánto se descuentó en total
- Si está activo o no
