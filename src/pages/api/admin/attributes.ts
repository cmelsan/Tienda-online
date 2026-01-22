
import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

// Helper to slugify
const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
};

export const POST: APIRoute = async ({ request, redirect }) => {
    const formData = await request.formData();
    const action = formData.get('action')?.toString();

    if (!action) {
        return new Response('Action is required', { status: 400 });
    }

    // 1. CREATE SUBCATEGORY
    if (action === 'create_subcategory') {
        const name = formData.get('name')?.toString();
        const category_id = formData.get('category_id')?.toString();

        if (!name || !category_id) return new Response('Missing fields', { status: 400 });

        const slug = slugify(name);

        const { error } = await supabase
            .from('subcategories')
            .insert({ name, slug, category_id });

        if (error) return new Response(error.message, { status: 500 });

        return redirect('/admin/atributos');
    }

    // 2. DELETE SUBCATEGORY
    if (action === 'delete_subcategory') {
        const id = formData.get('id')?.toString();
        if (!id) return new Response('Missing ID', { status: 400 });

        const { error } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', id);

        if (error) return new Response(error.message, { status: 500 });
        return redirect('/admin/atributos');
    }

    // 3. CREATE BRAND
    if (action === 'create_brand') {
        const name = formData.get('name')?.toString();
        if (!name) return new Response('Missing Name', { status: 400 });

        const slug = slugify(name);

        const { error } = await supabase
            .from('brands')
            .insert({ name, slug });

        if (error) return new Response(error.message, { status: 500 });
        return redirect('/admin/atributos');
    }

    // 4. DELETE BRAND
    if (action === 'delete_brand') {
        const id = formData.get('id')?.toString();
        if (!id) return new Response('Missing ID', { status: 400 });

        const { error } = await supabase
            .from('brands')
            .delete()
            .eq('id', id);

        if (error) return new Response(error.message, { status: 500 });
        return redirect('/admin/atributos');
    }

    return new Response('Invalid Action', { status: 400 });
};
