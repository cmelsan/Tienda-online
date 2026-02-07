import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

// GET: Returns list of product IDs in user's wishlist
export const GET: APIRoute = async ({ cookies }) => {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify([]), { status: 401 });
    }

    // Set session for RLS
    const { data: { session }, error } = await supabase.auth.setSession({
        access_token: accessToken.value,
        refresh_token: refreshToken.value,
    });

    if (error || !session) {
        return new Response(JSON.stringify([]), { status: 401 });
    }

    const { data } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', session.user.id);

    return new Response(JSON.stringify(data?.map(i => i.product_id) || []), {
        headers: { 'Content-Type': 'application/json' }
    });
};

// POST: Toggle item (Add/Remove)
export const POST: APIRoute = async ({ request, cookies }) => {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    // Set session
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken.value,
        refresh_token: refreshToken.value,
    });

    if (sessionError || !session) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
        return new Response(JSON.stringify({ message: 'Product ID required' }), { status: 400 });
    }

    // Check if exists (filter by both user_id AND product_id)
    const { data: existing } = await supabase
        .from('wishlist')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (existing) {
        // Remove
        await supabase.from('wishlist').delete().eq('product_id', productId).eq('user_id', session.user.id);
        return new Response(JSON.stringify({ action: 'removed' }), { status: 200 });
    } else {
        // Add
        await supabase.from('wishlist').insert({ product_id: productId, user_id: session.user.id });
        return new Response(JSON.stringify({ action: 'added' }), { status: 200 });
    }
};
