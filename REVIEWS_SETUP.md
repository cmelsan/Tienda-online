# 📝 Sistema de Reseñas y Opiniones de Productos

## ¿Qué se implementó?

Se añadió un sistema completo de reseñas donde los clientes que compraron un producto pueden:

✅ Dejar una calificación de 0 a 5 estrellas  
✅ Escribir un comentario detallado (hasta 500 caracteres)  
✅ Editar sus propias reseñas  
✅ Eliminar sus reseñas  
✅ Ver todas las reseñas de otros clientes  
✅ Ver estadísticas agregadas (promedio de estrellas, distribución por rating)

---

## 🔧 Pasos para Activar

### 1. **Ejecutar la migración SQL en Supabase**

1. Abre [Supabase Console](https://supabase.com)
2. Ve a **SQL Editor**
3. Abre el archivo `migration_reviews.sql` de tu proyecto
4. Copia TODO el contenido
5. Pégalo en el SQL Editor de Supabase
6. Haz clic en **Run** (o presiona Ctrl+Enter)

**Esta migración crea:**
- Tabla `reviews` con validación RLS
- Vista `product_ratings` para estadísticas
- Función `user_has_purchased_product()` para verificar compras
- Políticas de seguridad (Row Level Security)

### 2. **Verificar que todo está funcionando**

```sql
-- En Supabase SQL Editor, ejecuta esto para verificar:
SELECT COUNT(*) FROM reviews;
SELECT * FROM product_ratings LIMIT 1;
```

Deberían funcionar sin errores (la tabla puede estar vacía al principio).

---

## 📂 Archivos Creados/Modificados

### Nuevos Archivos:

- `src/components/reviews/ReviewsList.tsx` - Componente para mostrar reseñas
- `src/components/reviews/ReviewForm.tsx` - Formulario para crear/editar reseñas
- `src/components/reviews/ProductRating.tsx` - Widget de estrellas en tarjeta de producto
- `src/pages/api/reviews/index.ts` - API GET/POST reseñas
- `src/pages/api/reviews/[id].ts` - API PUT/DELETE reseñas
- `src/pages/api/reviews/can-review.ts` - API para verificar si usuario puede reseñar
- `migration_reviews.sql` - Script de creación de tabla y RLS

### Archivos Modificados:

- `src/components/product/ProductCard.astro` - Añadido widget de rating
- `src/pages/productos/[slug].astro` - Añadida sección de reseñas y formulario

---

## 🔐 Características de Seguridad

✅ **RLS (Row Level Security)**: Solo usuarios autenticados pueden ver/crear reseñas  
✅ **Validación de compra**: Solo usuarios que compraron el producto pueden reseñar  
✅ **Una reseña por usuario**: No se permiten duplicados  
✅ **Edición/Eliminación propia**: Los usuarios solo pueden modificar sus propias reseñas  
✅ **Tokens seguros**: Los endpoints API validan tokens JWT de Supabase

---

## 🎨 Componentes Visuales

### ProductRating (en tarjetas)
```
⭐⭐⭐⭐⭐ 4.5 (32)
```
Aparece en:
- Tarjetas de producto en categorías
- Grid de productos relacionados

### ReviewsList (en página de producto)
Muestra:
- Promedio de estrellas grande
- Gráfico de distribución (5-1 estrellas)
- Todas las reseñas ordenadas por fecha
- Autor anónimo (sin mostrar emails)

### ReviewForm (en página de producto)
- Selector interactivo de estrellas (1-5)
- Campo de comentario (opcional, 500 caracteres max)
- Botones: Publicar / Actualizar / Eliminar
- Mensajes de error/éxito
- Bloqueo automático si no ha comprado el producto

---

## 📊 Datos Mostrados

```javascript
// Para cada producto, se calcula:
{
  average_rating: 4.5,      // Promedio
  total_reviews: 32,        // Total de reseñas
  rating_5_percent: 15.6,   // % de 5 estrellas
  rating_4_percent: 50.0,   // % de 4 estrellas
  rating_3_percent: 25.0,   // % de 3 estrellas
  rating_2_percent: 6.3,    // % de 2 estrellas
  rating_1_percent: 3.1     // % de 1 estrella
}
```

---

## ⚙️ Variables de Entorno

No se requieren nuevas variables. El sistema usa:
- Supabase URL (ya configurado)
- Supabase Key (ya configurado)
- Auth token del usuario (obtenido automáticamente)

---

## 🧪 Probando Localmente

1. **Asegúrate que el servidor de desarrollo está corriendo:**
   ```bash
   npm run dev
   ```

2. **Navega a una página de producto:**
   - `/productos/nombre-producto`

3. **Para ver las reseñas:**
   - Desplázate hasta abajo de la página
   - Verás la sección "Opiniones de Clientes"

4. **Para crear una reseña:**
   - Debes estar autenticado
   - Debes haber comprado el producto
   - En caso contrario, verás un mensaje explicativo

---

## 🔄 Flujo de Usuario

```
1. Usuario navega a página de producto
   ↓
2. Ve las reseñas existentes y el rating promedio
   ↓
3. Si no está autenticado:
   → Ve botón "Inicia sesión para dejar tu opinión"
   ↓
4. Si está autenticado BUT no compró:
   → Ve mensaje "Debes comprar este producto para reseñar"
   ↓
5. Si está autenticado Y compró:
   → Ve formulario para dejar reseña
   ↓
6. Si ya dejó reseña:
   → Ve su reseña en verde con opciones Editar/Eliminar
```

---

## 📝 Estructura de Base de Datos

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,          -- Referencia al producto
  user_id UUID NOT NULL,              -- Referencia al usuario
  rating INTEGER (0-5),               -- Calificación
  comment TEXT (hasta 500 chars),     -- Comentario opcional
  created_at TIMESTAMP,               -- Fecha de creación
  updated_at TIMESTAMP,               -- Fecha de última edición
  UNIQUE(product_id, user_id)         -- Una reseña por usuario por producto
);

CREATE VIEW product_ratings AS
  -- Calcula automáticamente el promedio y distribución de ratings
  SELECT product_id, average_rating, total_reviews, percentages...;
```

---

## 🚀 Próximos Pasos Opcionales

Mejoras que podrías agregar:

1. **Fotos en reseñas**: Permitir que usuarios suban imágenes
2. **Útil/No útil**: Botones para marcar reseñas como útiles
3. **Respuestas admin**: Permitir que administradores respondan reseñas
4. **Filtrar por rating**: Mostrar solo reseñas de 5 estrellas, 4, etc.
5. **Ordenamiento**: Ordenar por fecha, útiles, rating más alto/bajo
6. **Verificado comprador**: Badge que indique "Comprador Verificado"

---

## ❓ Solución de Problemas

### "No veo el widget de rating en las tarjetas"
- Hard refresh (`Ctrl + Shift + R`)
- Revisa la consola del navegador para errores
- Verifica que `ProductRating.tsx` se importó correctamente

### "El formulario dice 'debes comprar para reseñar' pero ya compré"
- Verifica en Supabase que el order tiene status `completed`, `shipped` o `delivered`
- Comprueba que el `order_items` tiene el `product_id` correcto

### "Error al crear reseña: 'Ya existe una reseña'"
- Esto es normal si ya dejaste una reseña
- Usa el botón "Editar" para modificarla
- O "Eliminar" para quitarla y crear una nueva

### Las reseñas no aparecen
- Revisa que `migration_reviews.sql` se ejecutó completamente sin errores
- Verifica en Supabase que la tabla `reviews` existe
- Comprueba que hay datos en Reviews: `SELECT * FROM reviews;`

---

## 📞 Soporte

Si algo no funciona:
1. Revisa los errores en la consola del navegador (F12)
2. Verifica los logs de Supabase en el dashboard
3. Comprueba que las políticas RLS están activas
4. Intenta ejecutar nuevamente `migration_reviews.sql`

---

**¡Sistema de reseñas implementado exitosamente! 🎉**
