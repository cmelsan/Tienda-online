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
    const ids = [
        'aac027ee-c010-41da-ae8d-42659d4863a1',
        '41f2887b-11db-4501-8eab-fd127c906b51',
        'fffe811c-148e-4e22-bd2e-1dec0e6978fb',
        '758f6573-70aa-432c-aed7-f670f4ba7642',
        'cd0b9837-3cde-45f4-befd-08783a588fbb',
        '602d51ae-4237-4924-bd26-88736da4ed0f',
        '81fccfec-9e75-4f6c-949f-393165c9b128',
        'e256757a-e525-4c4f-b3fd-f13d53b159c5',
        '95b2bf9b-6810-4896-8702-68a00cbc7245',
        '052e8cad-6ee9-4ae8-98f8-175940003c5a',
        '6426f00c-cec5-4d9a-9a38-c6801168c6f1'
    ];

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', ids);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n=== PRODUCTOS EN REBAJAS ===\n');
    products.forEach(p => {
        const priceEur = (p.price / 100).toFixed(2);
        console.log(`✅ ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Precio: ${priceEur}€\n`);
    });
    console.log(`Total productos válidos: ${products.length}`);
}

inspectProducts();
