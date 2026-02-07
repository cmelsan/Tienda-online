import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: 'dmu6ttz2o',
  api_key: '599951616142124',
  api_secret: '7HOx2NTwIQqKi_ck4EhyeTi43Ng',
});

const brands = [
  { file: './public/assets/rare-beauty.webp', public_id: 'rare-beauty' },
  { file: './public/assets/fenty-beauty.webp', public_id: 'fenty-beauty' },
  { file: './public/assets/dior.jpg', public_id: 'dior' },
  { file: './public/assets/charlotte-tilbury.webp', public_id: 'charlotte-tilbury' },
];

let uploadedCount = 0;
const urls = {};

brands.forEach((brand) => {
  if (!fs.existsSync(brand.file)) {
    console.error(`❌ Archivo no encontrado: ${brand.file}`);
    return;
  }

  cloudinary.uploader.upload(brand.file, {
    folder: 'eclat-beauty/brands',
    public_id: brand.public_id,
    overwrite: true,
    resource_type: 'auto',
  }, (error, result) => {
    if (error) {
      console.error(`❌ Error subiendo ${brand.public_id}:`, error);
      return;
    }

    uploadedCount++;
    urls[brand.public_id] = result.secure_url;
    
    console.log(`✅ ${brand.public_id} subida exitosamente!`);
    console.log(`   URL: ${result.secure_url}\n`);

    if (uploadedCount === brands.length) {
      console.log('🎉 ¡Todas las imágenes se subieron correctamente!');
      console.log('\n📋 URLs para usar en el código:');
      Object.entries(urls).forEach(([brand, url]) => {
        console.log(`${brand}: ${url}`);
      });
    }
  });
});
