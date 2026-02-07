import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: 'dmu6ttz2o',
  api_key: '599951616142124',
  api_secret: '7HOx2NTwIQqKi_ck4EhyeTi43Ng',
});

const imagePath = './public/assets/hero-final.jpg';

if (!fs.existsSync(imagePath)) {
  console.error(`❌ Archivo no encontrado: ${imagePath}`);
  process.exit(1);
}

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
  
  console.log('✅ Imagen del hero subida exitosamente!');
  console.log('URL pública:', result.secure_url);
});
