
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, images, category_id');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log('Current Products Data:');
    products.forEach(p => {
        console.log(`- ID: ${p.id}, Name: ${p.name}, Images: ${JSON.stringify(p.images)}`);
    });
}

inspectProducts();
