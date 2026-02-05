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

async function findExpensiveProducts() {
    // Buscar productos con precio > 10000 centavos (> 100€) que podrían estar mal
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price')
        .gt('price', 10000)
        .order('price', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n=== PRODUCTOS CON PRECIO > 100€ ===\n');
    products.forEach(p => {
        const priceEur = (p.price / 100).toFixed(2);
        console.log(`${p.name}`);
        console.log(`   Precio: ${priceEur}€ (${p.price} centavos)`);
        if (p.price > 100000) {
            console.log(`   ⚠️ SOSPECHOSO - PROBABLEMENTE DUPLICADO x100\n`);
        } else {
            console.log();
        }
    });
}

findExpensiveProducts();
