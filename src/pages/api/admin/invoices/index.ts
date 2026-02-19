import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/invoices?type=invoice|credit_note&order_id=...&page=1
export const GET: APIRoute = async ({ request, cookies }) => {
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

    const url = new URL(request.url);
    const type      = url.searchParams.get('type');       // 'invoice' | 'credit_note' | null (todos)
    const orderId   = url.searchParams.get('order_id');
    const page      = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize  = 50;
    const offset    = (page - 1) * pageSize;

    let query = supabase
      .from('invoices')
      .select(`
        id, type, invoice_number, order_id, reference_invoice_id,
        credit_note_scope, subtotal, tax_rate, tax_amount,
        discount_amount, total_amount, customer_name, customer_email,
        stripe_refund_id, notes, issued_at, created_at,
        orders!invoices_order_id_fkey ( order_number )
      `, { count: 'exact' })
      .order('issued_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (type)    query = query.eq('type', type);
    if (orderId) query = query.eq('order_id', orderId);

    const { data: invoices, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data: invoices, total: count, page, pageSize }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
};
