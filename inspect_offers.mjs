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

async function inspectOffers() {
    const { data: settings, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'featured_offers')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching featured offers:', error);
        return;
    }

    if (settings && settings.value) {
        const offers = settings.value;
        console.log('\n=== FEATURED OFFERS EN BASE DE DATOS ===\n');
        console.log('Array completo:', JSON.stringify(offers, null, 2));
        console.log('\n=== ANÁLISIS ===');
        console.log(`Total items: ${offers.length}`);
        
        offers.forEach((offer, index) => {
            console.log(`\nItem ${index + 1}:`, offer);
            console.log(`  - Tiene ID: ${offer.id ? 'SÍ - ' + offer.id : 'NO ❌'}`);
            console.log(`  - Tiene discount: ${offer.discount !== undefined ? 'SÍ - ' + offer.discount : 'NO'}`);
        });

        const itemsWithoutId = offers.filter(o => !o.id);
        console.log(`\n=== RESUMEN ===`);
        console.log(`Items sin ID: ${itemsWithoutId.length}`);
        if (itemsWithoutId.length > 0) {
            console.log('Items problemáticos:', JSON.stringify(itemsWithoutId, null, 2));
        }
    } else {
        console.log('No settings found');
    }
}

inspectOffers();
