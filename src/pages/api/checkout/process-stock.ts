import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const DEBUG = import.meta.env.DEV;

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { items } = body; // items: [{ id: '...', quantity: 1 }]

    if (!items || items.length === 0) {
        return new Response(JSON.stringify({ error: "No items provided" }), { status: 400 });
    }

    // Use atomic RPC function to prevent race conditions
    // Each product stock deduction is locked with FOR UPDATE
    const errors: string[] = [];
    const successfulUpdates: { product_id: string; new_stock: number }[] = [];

    for (const item of items) {
        try {
            // Call atomic stock deduction function
            const { data, error } = await supabase.rpc('decrease_product_stock_atomic', {
                p_product_id: item.id,
                p_quantity: item.quantity
            });

            if (error) {
                if (DEBUG) console.error('[Stock] RPC error:', error);
                errors.push(`Error processing product ${item.id}: ${error.message}`);
                continue;
            }

            if (!data || !data.success) {
                const errorMsg = data?.error || 'Unknown error';
                errors.push(errorMsg);
                if (DEBUG) {
                    console.warn('[Stock] Deduction failed:', {
                        product_id: item.id,
                        error: errorMsg,
                        available: data?.available,
                        requested: data?.requested
                    });
                }
                continue;
            }

            // Success
            successfulUpdates.push({
                product_id: data.product_id,
                new_stock: data.new_stock
            });

            if (DEBUG) {
                console.log('[Stock] Deducted atomically:', {
                    product: data.product_name,
                    quantity: data.quantity_deducted,
                    new_stock: data.new_stock
                });
            }
        } catch (err: any) {
            console.error('[Stock] Exception:', err);
            errors.push(`Exception processing product ${item.id}`);
        }
    }

    if (errors.length > 0) {
        return new Response(JSON.stringify({ 
            success: false, 
            errors,
            partialSuccess: successfulUpdates.length > 0,
            successfulUpdates
        }), { status: 400 });
    }

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Stock updated successfully",
        updates: successfulUpdates
    }), { status: 200 });
};
