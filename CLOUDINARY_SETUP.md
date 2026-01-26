# 🖼️ Configuración de Cloudinary para Gestión de Imágenes

## 📋 Pasos para Configurar Cloudinary

### 1️⃣ Crear Cuenta en Cloudinary

1. Ve a [Cloudinary Sign Up](https://cloudinary.com/users/register/free)
2. Completa el formulario y verifica tu email
3. Inicia sesión en tu Dashboard

### 2️⃣ Obtener Credenciales

1. Ve a **Settings** (ícono de engranaje) → **API Keys**
2. Copia estos valores:
   - **Cloud Name** (ej: `dy1234abcd`)
   - **API Key** (ej: `123456789`)
   - **API Secret** (ej: `abc123xyz`)

⚠️ **IMPORTANTE**: El API Secret nunca debe exponerse en el navegador

### 3️⃣ Configurar Variables de Entorno

1. Abre o crea el archivo `.env.local` en la raíz del proyecto
2. Agrega las siguientes variables:

```bash
PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Reemplaza los valores con tus credenciales de Cloudinary

**Ejemplo completo:**
```bash
PUBLIC_CLOUDINARY_CLOUD_NAME=dy1a2b3c4d
PUBLIC_CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123defghijklmnop
```

### 4️⃣ Instalar Dependencias (Ya Hecho ✅)

Las siguientes dependencias ya fueron instaladas:
- `cloudinary` - SDK de Cloudinary
- `next-cloudinary` - Componentes de React

### 5️⃣ Archivos Creados

**Nuevos archivos añadidos:**

1. **src/lib/cloudinary.ts**
   - Configuración de Cloudinary
   - Utilidades para generar URLs
   - Manejo de firmas de subida

2. **src/pages/api/upload.ts**
   - Endpoint para subir imágenes al servidor
   - Método: POST
   - Retorna: `{ secure_url, public_id }`

3. **src/components/admin/ImageUploader.tsx**
   - Componente React reutilizable
   - Drag & drop
   - Preview de imágenes
   - Validación de archivos

4. **.env.cloudinary.example**
   - Archivo de referencia con las variables necesarias

---

## 🎯 Cómo Usar en Admin de Productos

### En `/admin/productos/nuevo.astro`:

```astro
---
import ImageUploader from '@/components/admin/ImageUploader';
---

<form>
  <ImageUploader client:load onImageAdded={(url) => {
    // Manejar imagen añadida
  }} />
  
  <!-- Resto del formulario -->
</form>
```

### En el script del formulario:

```javascript
const images = [];

function handleImageAdded(url) {
  images.push(url);
  console.log('Imágenes actuales:', images);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  formData.set('images', images.join('\n')); // Agregar imágenes
  // Enviar al servidor
});
```

---

## 📊 Estructura de Subida

```
Cloudinary Folder:
└── eclat-beauty/
    └── products/
        ├── producto1_abc123.jpg
        ├── producto1_def456.jpg
        ├── producto2_ghi789.jpg
        └── ...
```

Cada imagen se organiza automáticamente en la carpeta `eclat-beauty/products` para mantener todo organizado.

---

## 🔐 Seguridad

**Información Pública (segura en .env):**
- `PUBLIC_CLOUDINARY_CLOUD_NAME` - Se expone en el navegador
- `PUBLIC_CLOUDINARY_API_KEY` - Se expone en el navegador

**Información Privada (NUNCA expongas):**
- `CLOUDINARY_API_SECRET` - Solo en servidor (Node.js)

El upload siempre se realiza a través de `/api/upload` (servidor) para mantener seguridad.

---

## ✅ Testeo Local

### Con `npm run dev`:

1. Ve a `/admin/productos/nuevo`
2. Deberías ver el área de drag & drop
3. Selecciona una imagen
4. Debería subirse a Cloudinary
5. La URL se agregará a la lista

### URLs Generadas:

Las URLs tienen este formato:
```
https://res.cloudinary.com/{cloud_name}/image/upload/v{timestamp}/eclat-beauty/products/{public_id}.jpg
```

Ejemplo real:
```
https://res.cloudinary.com/dy1a2b3c4d/image/upload/v1642123456/eclat-beauty/products/producto1_abc123.jpg
```

---

## 🚀 Optimizaciones Automáticas

Cloudinary automáticamente:
- ✅ Convierte a WebP si el navegador lo soporta
- ✅ Redimensiona para pantallas responsive
- ✅ Comprime sin perder calidad
- ✅ Optimiza para diferentes dispositivos
- ✅ Cachea globalmente (CDN)

### Ejemplo de uso con transformaciones:

```typescript
import { getCloudinaryUrl } from '@/lib/cloudinary';

// Imagen optimizada para thumbnail (200x200)
const thumbnail = getCloudinaryUrl(publicId, {
  width: 200,
  height: 200,
  crop: 'fill',
  quality: 'auto',
  format: 'auto',
});

// Imagen para galería (800x800)
const gallery = getCloudinaryUrl(publicId, {
  width: 800,
  height: 800,
  crop: 'fill',
  quality: 'auto',
  format: 'webp',
});
```

---

## 🆘 Troubleshooting

### Error: "Cloudinary credentials not found"
**Solución:** Verifica que `.env.local` tenga las tres variables correctas

### Error: "Upload failed"
**Solución:** 
- Verifica que la imagen sea < 5MB
- Comprueba que sea un archivo de imagen válido
- Verifica que tu cuenta de Cloudinary esté activa

### Error: "Network error"
**Solución:**
- Asegúrate que `/api/upload` está corriendo
- Verifica la consola del navegador para más detalles
- Comprueba que tienes conexión a internet

### Las imágenes no se muestran
**Solución:**
- Verifica que la URL sea correcta
- Comprueba los permisos en Cloudinary Dashboard
- Intenta forzar recarga del navegador (Ctrl+Shift+R)

---

## 📚 Recursos

- [Documentación de Cloudinary](https://cloudinary.com/documentation)
- [Dashboard de Cloudinary](https://cloudinary.com/console)
- [API Reference](https://cloudinary.com/documentation/cloudinary_references)
- [Transform Reference](https://cloudinary.com/documentation/transformation_reference)

---

## ✨ Próximas Mejoras

- [ ] Integrar en formulario de editar productos
- [ ] Agregar reordenamiento de imágenes (drag & drop)
- [ ] Eliminar imágenes individuales
- [ ] Compresión automática al subir
- [ ] Previsualizaciones en tiempo real
- [ ] Soporte para múltiples idiomas
