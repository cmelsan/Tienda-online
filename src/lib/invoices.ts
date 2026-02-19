/**
 * Helpers de facturación — llaman a las funciones RPC de Supabase
 * que crean la factura o el abono directamente en la BD.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
export interface InvoiceLineItem {
  order_item_id: string | null;
  product_id:    string | null;
  name:          string;
  quantity:      number;
  unit_price_gross: number; // con IVA, en céntimos
  unit_price_net:   number; // sin IVA, en céntimos
  tax_rate:      number;
  line_total:    number;    // + en venta, - en abono
}

export interface Invoice {
  id:                   string;
  type:                 'invoice' | 'credit_note';
  invoice_number:       string;
  order_id:             string;
  reference_invoice_id: string | null;
  credit_note_scope:    'full' | 'partial' | null;
  subtotal:             number;
  tax_rate:             number;
  tax_amount:           number;
  discount_amount:      number;
  total_amount:         number;
  customer_name:        string | null;
  customer_email:       string | null;
  customer_address:     Record<string, any> | null;
  customer_nif:         string | null;
  line_items:           InvoiceLineItem[];
  stripe_refund_id:     string | null;
  notes:                string | null;
  issued_at:            string;
  created_at:           string;
  // join
  orders?: { order_number: string };
}

// ─────────────────────────────────────────────
// Formatters compartidos
// ─────────────────────────────────────────────
export const formatCents = (cents: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    Math.abs(cents) / 100
  );

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

// ─────────────────────────────────────────────
// Crear factura de venta (cuando el pedido = paid)
// Llama a la RPC create_sale_invoice
// ─────────────────────────────────────────────
export async function createSaleInvoice(
  supabase: SupabaseClient,
  orderId: string,
  stripeSessionId?: string
): Promise<{ success: boolean; invoice_number?: string; invoice_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_sale_invoice', {
    p_order_id:         orderId,
    p_stripe_session_id: stripeSessionId ?? null,
  });

  if (error) {
    console.error('[Invoices] create_sale_invoice RPC error:', error.message);
    return { success: false, error: error.message };
  }

  if (!data?.success) {
    // invoice_already_exists es idempotente — no es un error real
    if (data?.error === 'invoice_already_exists') {
      console.log('[Invoices] Sale invoice already exists for order:', orderId);
      return { success: true };
    }
    console.error('[Invoices] create_sale_invoice failed:', data?.error);
    return { success: false, error: data?.error };
  }

  console.log('[Invoices] Sale invoice created:', data.invoice_number);
  return { success: true, invoice_number: data.invoice_number, invoice_id: data.invoice_id };
}

// ─────────────────────────────────────────────
// Crear factura de abono (cuando se procesa un reembolso)
// Llama a la RPC create_credit_note
// ─────────────────────────────────────────────
export async function createCreditNote(
  supabase: SupabaseClient,
  params: {
    orderId:         string;
    refundAmount:    number;   // en céntimos (positivo)
    refundedItemIds: string[]; // UUIDs de order_items reembolsados
    stripeRefundId?: string;
    notes?:          string;
  }
): Promise<{ success: boolean; credit_note_number?: string; credit_note_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_credit_note', {
    p_order_id:          params.orderId,
    p_refund_amount:     params.refundAmount,
    p_refunded_item_ids: params.refundedItemIds.length > 0 ? params.refundedItemIds : null,
    p_stripe_refund_id:  params.stripeRefundId ?? null,
    p_notes:             params.notes ?? null,
  });

  if (error) {
    console.error('[Invoices] create_credit_note RPC error:', error.message);
    return { success: false, error: error.message };
  }

  if (!data?.success) {
    console.error('[Invoices] create_credit_note failed:', data?.error);
    return { success: false, error: data?.error };
  }

  console.log('[Invoices] Credit note created:', data.credit_note_number, '— scope:', data.scope);
  return {
    success: true,
    credit_note_number: data.credit_note_number,
    credit_note_id:     data.credit_note_id,
  };
}

// ─────────────────────────────────────────────
// Calcular importes de factura para mostrar en UI
// ─────────────────────────────────────────────
export function calcInvoiceTotals(
  grossTotal: number,
  taxRate: number = 21,
  discountAmount: number = 0
): { subtotal: number; taxAmount: number; totalWithTax: number } {
  const afterDiscount = grossTotal - discountAmount;
  const taxAmount     = Math.round(afterDiscount - afterDiscount / (1 + taxRate / 100));
  const subtotal      = afterDiscount - taxAmount;
  return { subtotal, taxAmount, totalWithTax: afterDiscount };
}
