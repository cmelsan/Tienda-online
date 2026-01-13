import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { items } = body; // items: [{ id: '...', quantity: 1 }]

    if (!items || items.length === 0) {
        return new Response(JSON.stringify({ error: "No items provided" }), { status: 400 });
    }

    // Transaction-like logic (Supabase doesn't support full transactions via client easily without RPC, 
    // so we will do optimistic updates or individual updates for this demo)

    const errors = [];

    for (const item of items) {
        // 1. Check stock
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();

        if (fetchError || !product) {
            errors.push(`Product ${item.id} not found`);
            continue;
        }

        if (product.stock < item.quantity) {
            errors.push(`Insufficient stock for product ${item.id}`);
            continue;
        }

        // 2. Decrement Stock
        const { error: updateError } = await supabase
            .from('products')
            .update({ stock: product.stock - item.quantity })
            .eq('id', item.id);

        if (updateError) {
            errors.push(`Failed to update stock for product ${item.id}`);
        }
    }

    if (errors.length > 0) {
        return new Response(JSON.stringify({ success: false, errors }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, message: "Stock updated successfully" }), { status: 200 });
};
