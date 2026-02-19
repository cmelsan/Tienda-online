import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/invoices/[id]
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = await createServerSupabaseClient({ cookies }, true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({ success: false, message: 'No autorizado' }), { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ success: false, message: 'Acceso de administrador requerido' }), { status: 403 });
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        orders!invoices_order_id_fkey ( order_number, status, shipping_address ),
        reference_invoice:invoices!invoices_reference_invoice_id_fkey ( invoice_number )
      `)
      .eq('id', params.id!)
      .single();

    if (error || !invoice) {
      return new Response(JSON.stringify({ success: false, message: 'Factura no encontrada' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, data: invoice }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
};
