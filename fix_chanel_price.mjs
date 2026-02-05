import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.error('URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.error('Service Role Key:', supabaseKey ? 'OK' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPrice() {
    // CHANEL Nº 5 - debe ser 8800 centavos (88€) no 880000
    const { data, error } = await supabase
        .from('products')
        .update({ price: 8800 })
        .eq('id', 'aac027ee-c010-41da-ae8d-42659d4863a1')
        .select();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Precio corregido:');
        console.log(`Producto: ${data[0].name}`);
        console.log(`Nuevo precio: ${(data[0].price / 100).toFixed(2)}€ (${data[0].price} centavos)`);
    } else {
        console.log('No se encontró el producto o no se actualizó');
    }
}

fixPrice();
