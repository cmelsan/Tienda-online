// POST /api/admin/invoices/generate
// Genera manualmente la factura de venta para un pedido pagado que no la tiene aún
export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createSaleInvoice } from '@/lib/invoices';

export const POST: APIRoute = async (context) => {
  const supabase = await createServerSupabaseClient(context, true);

  // Auth: solo admins
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 403 });
  }

  const body = await context.request.json();
  const { orderId } = body;

  if (!orderId) {
    return new Response(JSON.stringify({ success: false, error: 'orderId requerido' }), { status: 400 });
  }

  const result = await createSaleInvoice(supabase, orderId);

  // invoice_already_exists no es error — devolver OK igualmente
  if (!result.success && result.error === 'invoice_already_exists') {
    return new Response(JSON.stringify({ success: true, info: 'Ya existe una factura para este pedido' }), { status: 200 });
  }

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
};
