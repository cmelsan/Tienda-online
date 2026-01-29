import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'dmu6ttz2o',
  api_key: '599951616142124',
  api_secret: '7HOx2NTwIQqKi_ck4EhyeTi43Ng',
});

// Ruta de la imagen local (cámbiala si es necesario)
const imagePath = './public/assets/hero-makeup.jpg';

// Verificar si el archivo existe
if (!fs.existsSync(imagePath)) {
  console.error(`❌ Archivo no encontrado: ${imagePath}`);
  console.log('Por favor, guarda la imagen en: public/assets/hero-makeup.jpg');
  process.exit(1);
}

// Subir la imagen
cloudinary.uploader.upload(imagePath, {
  folder: 'eclat-beauty',
  public_id: 'hero-makeup-girl',
  overwrite: true,
  resource_type: 'auto',
}, (error, result) => {
  if (error) {
    console.error('❌ Error al subir:', error);
    process.exit(1);
  }
  
  console.log('✅ Imagen subida exitosamente!');
  console.log('URL pública:', result.secure_url);
  console.log('\n📋 Copia esta URL para usar en el código:');
  console.log(result.secure_url);
});
