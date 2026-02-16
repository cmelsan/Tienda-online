# Diagnóstico: Botón "Añadir a la Cesta" y Precios

## Cambios Realizados

### 1. **AddToCartButton.tsx** - Enhanced error handling & logging
- ✅ Valida que el producto y cantidad sean válidos
- ✅ Logging detallado con prefijo `[AddToCart]` en consola
- ✅ Abre el carrito automáticamente después de añadir producto
- ✅ Muestra errores claros al usuario

### 2. **cart.ts** - Improved price validation
- ✅ Valida que `product.price` sea un número válido
- ✅ Valida que el precio sea ≥ 0
- ✅ Logging de debug con `[addToCart]` en consola
- ✅ Mejor manejo de stock

## Cómo Diagnosticar el Problema

### Paso 1: Verificar que el botón responde
1. Abre tu sitio en Firefox o Chrome
2. Abre DevTools (F12)
3. Ve a la pestaña **Console**
4. Navega a un producto y haz click en "Añadir a la cesta"
5. **Busca estos logs en la consola:**
   ```
   [AddToCart] Adding product: { id, name, price, discount, quantity }
   [addToCart] Item added: { productId, quantity, price }
   ```

**Si ves los logs:** El botón funciona, el problema está en otro lugar (display/formatPrice)
**Si NO ves los logs:** El botón no se ejecuta, problema en el click handler

---

### Paso 2: Verificar el formato de precio en database
1. Abre Supabase
2. Ve a tabla `products`
3. Busca un producto que sabes que cuesta 42€
4. **Mira la columna `price`:**
   - ✅ Correcto: `4200` (42 euros en centavos)
   - ❌ Incorrecto: `420000` (intentando guardar 4200€ en centavos)
   - ❌ Incorrecto: `42` (guardar directamente en euros, sin centavos)

**Fórmula correcta:** `precio_en_euros * 100 = precio_en_centavos`
- 42€ = 4200 centavos
- 10€ = 1000 centavos

---

### Paso 3: Verificar cálculo de precio con descuento
Si el producto tiene descuento y se muestra mal:
1. Revisa que `productDiscountedPrice` se calcule correctamente en `[slug].astro`
2. El descuento debe aplicarse ANTES de pasar al componente
3. El precio pasado debe estar en centavos

---

### Paso 4: Verificar que formatPrice() se llama en display
En `CartSlideOver.tsx` (línea ~125):
```tsx
formatPrice(item.product.price / item.quantity)  // ← Esto es INCORRECTO
formatPrice(item.product.price)  // ← Esto es CORRECTO
```

El precio ya está en centavos. NO dividir por cantidad en el formato.

---

## Solución por Escenarios

### ❌ Escenario 1: Botón no responde (no ves logs)
**Causa probable:** Click handler no se dispara en el componente React
**Solución:**
1. Verifica que `onclick` esté en el `<button>` element
2. Verifica que no hay atributo `disabled` que impida clicks
3. Revisa la consola por errores de React: `<Component> is not defined`

### ❌ Escenario 2: Logs aparecen pero precio es 100x demasiado alto (4200€ en lugar de 42€)
**Causa probable:** `product.price` = `420000` en la database
**Solución:**
```sql
-- Vender todos los precios por 100
UPDATE products 
SET price = FLOOR(price / 100) 
WHERE price > 10000;  -- Solo produtos cara
```

### ❌ Escenario 3: Precio en carrito muestra 4200,00 € en lugar de 42,00 €
**Causa probable:** `formatPrice()` no se llama o se llama incorrectamente
**Solución:**
- En CartSlideOver: `formatPrice(item.product.price)` 
- En producto página: `formatPrice(productPrice)`
- En checkout: `formatPrice(total)` donde total = suma de todos los items

### ✅ Escenario 4: Todo funciona
- Logs aparecen con precio correcto
- Carrito muestra precio formateado correctamente
- Checkout computa el total correctamente

---

## Próximos Pasos

1. **Commit estos cambios:**
   ```bash
   git add -A
   git commit -m "Improve cart validation and error logging for Add to Cart debugging"
   ```

2. **Test localmente:**
   - `npm run dev`
   - Abre console (F12)
   - Prueba añadir un producto
   - Verifica logs y precio mostrado

3. **Si descubres problema:**
   - Usa este diagnostic guide para identificar el escenario
   - Aplica la solución correspondiente
   - Re-test

4. **Deploy cuando todo funcione:**
   ```bash
   git push origin main
   ```

---

## Query de Validación Rápida

Para verificar rápidamente los precios en Supabase:

```sql
-- Ver primeros 5 productos con su precio en centavos
SELECT id, name, price, 
       ROUND(price::numeric / 100, 2) as price_in_euros
FROM products 
LIMIT 5;

-- Ver productos con precios "sospechosos" (>1M centavos = >10k€)
SELECT id, name, price 
FROM products 
WHERE price > 1000000;
```

---

## Archivos Modificados

- `src/components/islands/AddToCartButton.tsx` - Enhanced error handling & logging
- `src/stores/cart.ts` - Improved price validation
