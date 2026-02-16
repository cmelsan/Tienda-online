# FIX: Problema de Precios con Doble Conversión

## 🐛 El Problema

Cuando añadías un producto con precio **40€**, se guardaba como **4000€** (o sea, 400000 céntimos).
Cuando lo editabas, se guardaba como **39.99€** o valores extraños.

## 🔍 La Causa

La conversión de precio se estaba haciendo **DOS VECES**:

1. **Frontend** (en nuevo.astro y ProductEditForm.tsx):
   ```javascript
   const priceInCents = Math.round(price * 100);  // 40€ → 4000 céntimos ✓ CORRECTO
   ```
   El frontend enviaba al API: `{price: 4000}`

2. **API** (en products.ts - línea 52 y 142):
   ```typescript
   const priceInCents = Math.round(price * 100);  // 4000 → 400000 ❌ INCORRECTO
   ```
   El API asumía que recibía euros y volvía a multiplicar.

**Resultado:** 40€ terminaba como 400000 céntimos = 4000€ ❌

## ✅ La Solución

### Parte 1: Corregir el API (YA HECHO)
He actualizado `src/pages/api/admin/products.ts` para que ya NO multiplique por 100:
```typescript
// Frontend already sends price in cents
const priceInCents = typeof price === 'string' ? Math.round(parseFloat(price)) : Math.round(price);
```

### Parte 2: Arreglar los Datos Existentes en BD

#### Opción A: Verificar qué está mal (SEGURO - solo lectura)
1. Abre tu Supabase SQL editor
2. Ve a la carpeta raíz del proyecto
3. Abre `FIX_PRICE_ISSUE.sql`
4. Ejecuta el STEP 1 para ver qué productos tienen precios sospechosos

#### Opción B: Arreglar automáticamente (SI VES PRODUCTOS ROTOS)
Si después del STEP 1 ves que hay productos caros (ej: "CHANEL Nº 5" con 880000 cuando debería ser 8800):

1. Ejecuta el STEP 2 en SQL:
   ```sql
   UPDATE products
   SET price = FLOOR(price / 100)
   WHERE price > 50000;  -- Divide entre 100 los precios > 500€
   ```

2. Ejecuta el STEP 3 para verificar que quedó bien

---

## ¿Cómo Confirmar que Está Arreglado?

**Prueba nueva:**
1. Crea un producto con precio **25.99€**
2. Mira en Supabase → tabla `products` → columna `price`
3. Debería mostrar **2599** (no 259900)
4. En el carrito debería aparecer como **25,99€** ✓

**Si modificas el precio:**
1. Edita el producto a **50€**
2. Debería guardarse como **5000** (no 500000)
3. En el carrito: **50,00€** ✓

---

## 📋 Resumen de Cambios

| Componente | Cambio |
|-----------|--------|
| `src/pages/api/admin/products.ts` (POST) | ❌ Eliminar `* 100` en línea 52 |
| `src/pages/api/admin/products.ts` (PUT) | ❌ Eliminar `* 100` en línea 142 |
| `src/pages/admin/productos/nuevo.astro` | ✓ SIN CAMBIOS (correcto) |
| `src/components/admin/ProductEditForm.tsx` | ✓ SIN CAMBIOS (correcto) |

---

## 🔧 Próximos Pasos

1. ✅ **API corregido** (products.ts)
2. ⏳ **Ejecuta el SQL** para arreglar precios existentes
3. ⏳ **Prueba un nuevo producto** con decimales (ej: 25.99€)
4. ✅ Verificar en Supabase que se guardó como 2599 céntimos
