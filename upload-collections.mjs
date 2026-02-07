import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'dmu6ttz2o',
  api_key: '599951616142124',
  api_secret: '7HOx2NTwIQqKi_ck4EhyeTi43Ng',
});

const collections = [
  {
    name: 'Maquillaje',
    imagePath: 'C:\\Users\\mella\\Desktop\\maquillaje.webp',
    publicId: 'collection-maquillaje'
  },
  {
    name: 'Cabello',
    imagePath: 'C:\\Users\\mella\\Downloads\\pelo.jpg',
    publicId: 'collection-cabello'
  },
  {
    name: 'Cuerpo',
    imagePath: 'C:\\Users\\mella\\Downloads\\cuerpo.jpg',
    publicId: 'collection-cuerpo'
  },
  {
    name: 'Perfumes',
    imagePath: 'C:\\Users\\mella\\Downloads\\perfume.jpg',
    publicId: 'collection-perfumes'
  }
];

async function uploadCollections() {
  const results = {};
  
  for (const collection of collections) {
    try {
      if (!fs.existsSync(collection.imagePath)) {
        console.error(`❌ Archivo no encontrado: ${collection.imagePath}`);
        continue;
      }
      
      console.log(`⏳ Subiendo ${collection.name}...`);
      
      const result = await cloudinary.uploader.upload(collection.imagePath, {
        folder: 'eclat-beauty',
        public_id: collection.publicId,
        overwrite: true,
        resource_type: 'auto',
      });
      
      results[collection.name] = result.secure_url;
      console.log(`✅ ${collection.name} subida exitosamente!`);
      console.log(`   URL: ${result.secure_url}\n`);
      
    } catch (error) {
      console.error(`❌ Error al subir ${collection.name}:`, error.message);
    }
  }
  
  console.log('\n📋 RESUMEN DE URLs:');
  console.log('========================');
  Object.entries(results).forEach(([name, url]) => {
    console.log(`${name}: ${url}`);
  });
  
  return results;
}

uploadCollections();
