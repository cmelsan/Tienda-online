/**
 * Helpers de facturación — llaman a las funciones RPC de Supabase
 * que crean la factura o el abono directamente en la BD.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import * as PDFDocument from 'pdfkit';

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
// Generar HTML de factura/abono para adjuntar al email
// ─────────────────────────────────────────────
export function generateInvoiceHtml(invoice: any, orderNumber?: string): string {
  const isCreditNote = invoice.type === 'credit_note';
  const lineItems: any[] = invoice.line_items || [];
  const address = invoice.customer_address || {};
  const docTitle = isCreditNote
    ? `Factura de abono${invoice.credit_note_scope === 'partial' ? ' (parcial)' : ''}`
    : 'Factura de venta';

  const lineItemsHtml = lineItems.map(item => {
    const gross = Math.abs(item.unit_price_gross);
    const net   = Math.abs(item.unit_price_net);
    const tax   = gross - net;
    const qty   = item.quantity;
    const total = Math.abs(item.line_total);
    return `
      <tr>
        <td>${item.name}</td>
        <td class="c">${qty}</td>
        <td class="r">${formatCents(gross)}</td>
        <td class="r">${formatCents(net * qty)}</td>
        <td class="r">${formatCents(tax * qty)}</td>
        <td class="bold${isCreditNote ? ' neg' : ''}">${isCreditNote ? '-' : ''}${formatCents(total)}</td>
      </tr>`;
  }).join('');

  const discountRow = invoice.discount_amount > 0
    ? `<div class="totals-row"><span>Descuento (cupón)</span><span>-${formatCents(invoice.discount_amount)}</span></div>`
    : '';

  const creditBanner = isCreditNote
    ? `<div class="credit-banner">Factura de abono — ${invoice.credit_note_scope === 'partial' ? 'devolución parcial' : 'devolución total'}</div>`
    : '';

  const notesSection = invoice.notes
    ? `<div class="notes"><strong>Notas</strong>${invoice.notes}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${invoice.invoice_number} — ÉCLAT Beauty</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111;background:#f5f5f5}
  .page{max-width:820px;margin:40px auto;background:#fff;padding:56px 64px;box-shadow:0 2px 24px rgba(0,0,0,.08)}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;border-bottom:3px solid #000;padding-bottom:28px}
  .brand-name{font-size:24px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase}
  .brand-sub{font-size:9px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
  .doc-meta{text-align:right}
  .doc-type{font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888}
  .doc-number{font-size:20px;font-weight:900;font-family:monospace;margin-top:4px}
  .doc-date{font-size:11px;color:#888;margin-top:4px}
  .credit-banner{background:#000;color:#fff;padding:10px 16px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}
  .parties{display:grid;grid-template-columns:1fr 1fr;margin-bottom:40px;border:1px solid #e8e8e8}
  .party{padding:20px 24px}
  .party:first-child{border-right:1px solid #e8e8e8}
  .party-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:8px}
  .party-name{font-size:14px;font-weight:700;margin-bottom:4px}
  .party-info{font-size:12px;color:#444;line-height:1.7}
  .order-ref{margin-bottom:20px;font-size:11px;color:#888}
  .order-ref strong{color:#111}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#000;color:#fff}
  thead th{padding:10px 12px;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:left;color:#fff}
  thead th.r{text-align:right} thead th.c{text-align:center}
  tbody tr{border-bottom:1px solid #e5e7eb}
  tbody tr:last-child{border-bottom:none}
  tbody td{padding:12px;font-size:12px;vertical-align:top}
  tbody td.r{text-align:right} tbody td.c{text-align:center;color:#888}
  tbody td.bold{font-weight:700;text-align:right} tbody td.neg{color:#dc2626}
  .totals-wrap{display:flex;justify-content:flex-end;margin-top:4px;border-top:2px solid #000}
  .totals{width:320px}
  .totals-row{display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;border-bottom:1px solid #f0f0f0}
  .totals-total{display:flex;justify-content:space-between;padding:13px 12px;font-size:15px;font-weight:900;background:#000;color:#fff}
  .totals-total.credit{background:#dc2626}
  .notes{margin-top:36px;padding:14px 18px;border-left:3px solid #000;background:#f9f9f9;font-size:11px;color:#444;line-height:1.6}
  .notes strong{display:block;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:6px}
  .footer{margin-top:48px;padding-top:20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa;letter-spacing:1px}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">Éclat Beauty</div>
      <div class="brand-sub">Tienda online de cosmética</div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">${docTitle}</div>
      <div class="doc-number">${invoice.invoice_number}</div>
      <div class="doc-date">${formatDate(invoice.issued_at)}</div>
    </div>
  </div>

  ${creditBanner}

  <div class="parties">
    <div class="party">
      <div class="party-label">Emisor</div>
      <div class="party-name">Éclat Beauty S.L.</div>
      <div class="party-info">CIF: B-XXXXXXXX<br/>Calle Ejemplo, 1<br/>28001 Madrid, España<br/>hola@eclatbeauty.com</div>
    </div>
    <div class="party">
      <div class="party-label">Cliente</div>
      <div class="party-name">${invoice.customer_name || 'Cliente'}</div>
      <div class="party-info">
        ${invoice.customer_email ? `${invoice.customer_email}<br/>` : ''}
        ${invoice.customer_nif ? `NIF/CIF: ${invoice.customer_nif}<br/>` : ''}
        ${address.address ? `${address.address}<br/>` : ''}
        ${address.city ? `${address.city}${address.province ? `, ${address.province}` : ''}<br/>` : ''}
        ${address.postal_code ? `${address.postal_code} ${address.country || 'España'}` : ''}
      </div>
    </div>
  </div>

  <div class="order-ref">Pedido: <strong>#${orderNumber || String(invoice.order_id).slice(0, 8)}</strong></div>

  <table>
    <thead>
      <tr>
        <th style="width:50%">Descripción</th>
        <th class="c">Cant.</th>
        <th class="r">P. unitario</th>
        <th class="r">Base imp.</th>
        <th class="r">IVA ${invoice.tax_rate}%</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>${lineItemsHtml}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row">
        <span>Base imponible</span>
        <span>${isCreditNote ? '-' : ''}${formatCents(Math.abs(invoice.subtotal))}</span>
      </div>
      ${discountRow}
      <div class="totals-row">
        <span>IVA (${invoice.tax_rate}%)</span>
        <span>${isCreditNote ? '-' : ''}${formatCents(Math.abs(invoice.tax_amount))}</span>
      </div>
      <div class="totals-total${isCreditNote ? ' credit' : ''}">
        <span>TOTAL</span>
        <span>${isCreditNote ? '-' : ''}${formatCents(Math.abs(invoice.total_amount))}</span>
      </div>
    </div>
  </div>

  ${notesSection}

  <div class="footer">
    <span>Éclat Beauty S.L. — CIF: B-XXXXXXXX</span>
    <span>Documento generado el ${formatDate(new Date().toISOString())}</span>
  </div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Generar PDF de factura/abono con pdfkit
// ─────────────────────────────────────────────
export async function generateInvoicePdf(invoice: any, orderNumber?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50, bufferPages: true });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const isCreditNote = invoice.type === 'credit_note';
    const lineItems: any[] = invoice.line_items || [];
    const address = invoice.customer_address || {};
    const docTitle = isCreditNote
      ? `Factura de abono${invoice.credit_note_scope === 'partial' ? ' (parcial)' : ''}`
      : 'Factura de venta';
    const W = doc.page.width - 100; // usable width (margins 50 each side)
    const L = 50; // left margin

    // ── Colores ──────────────────────────────
    const BLACK   = '#000000';
    const GRAY    = '#888888';
    const LGRAY   = '#e5e7eb';
    const WHITE   = '#ffffff';
    const RED     = '#dc2626';
    const ACCENT  = isCreditNote ? RED : BLACK;

    // ── Helper: formatCents inline ────────────
    const fmt = (cents: number) =>
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
        Math.abs(cents) / 100
      );
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    // ═══════════════════════════════════════
    //  HEADER
    // ═══════════════════════════════════════
    // Brand
    doc.fontSize(22).font('Helvetica-Bold').fillColor(BLACK).text('ÉCLAT BEAUTY', L, 50);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('Tienda online de cosmética', L, 76);

    // Doc meta (right-aligned)
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(docTitle.toUpperCase(), 0, 50, { align: 'right' });
    doc.fontSize(16).font('Helvetica-Bold').fillColor(BLACK).text(invoice.invoice_number, 0, 62, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text(fmtDate(invoice.issued_at), 0, 82, { align: 'right' });

    // Horizontal rule
    doc.moveTo(L, 100).lineTo(L + W, 100).lineWidth(2).strokeColor(BLACK).stroke();

    // ═══════════════════════════════════════
    //  CREDIT NOTE BANNER
    // ═══════════════════════════════════════
    let yPos = 110;
    if (isCreditNote) {
      doc.rect(L, yPos, W, 22).fill(RED);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
        .text(`FACTURA DE ABONO — ${invoice.credit_note_scope === 'partial' ? 'DEVOLUCIÓN PARCIAL' : 'DEVOLUCIÓN TOTAL'}`,
          L, yPos + 7, { align: 'center', width: W });
      yPos += 32;
    }

    // ═══════════════════════════════════════
    //  PARTIES
    // ═══════════════════════════════════════
    doc.rect(L, yPos, W / 2 - 4, 90).strokeColor(LGRAY).lineWidth(1).stroke();
    doc.rect(L + W / 2 + 4, yPos, W / 2 - 4, 90).strokeColor(LGRAY).lineWidth(1).stroke();

    // Emisor
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('EMISOR', L + 10, yPos + 10);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BLACK).text('Éclat Beauty S.L.', L + 10, yPos + 22);
    doc.fontSize(9).font('Helvetica').fillColor('#444444')
      .text(`CIF: B-XXXXXXXX\nCalle Ejemplo, 1\n28001 Madrid, España\nhola@eclatbeauty.com`, L + 10, yPos + 38, { lineGap: 2 });

    // Cliente
    const rxParty = L + W / 2 + 14;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('CLIENTE', rxParty, yPos + 10);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BLACK).text(invoice.customer_name || 'Cliente', rxParty, yPos + 22);
    const clientLines = [
      invoice.customer_email,
      invoice.customer_nif ? `NIF/CIF: ${invoice.customer_nif}` : null,
      address.address,
      address.city ? `${address.city}${address.province ? `, ${address.province}` : ''}` : null,
      address.postal_code ? `${address.postal_code} ${address.country || 'España'}` : null,
    ].filter(Boolean).join('\n');
    doc.fontSize(9).font('Helvetica').fillColor('#444444').text(clientLines || '-', rxParty, yPos + 38, { lineGap: 2 });

    yPos += 100;

    // Order ref
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
      .text(`Pedido: `, L, yPos, { continued: true })
      .font('Helvetica-Bold').fillColor(BLACK)
      .text(`#${orderNumber || String(invoice.order_id).slice(0, 8)}`);
    yPos += 20;

    // ═══════════════════════════════════════
    //  TABLE HEADER
    // ═══════════════════════════════════════
    const colDesc = L;
    const colQty  = L + W * 0.48;
    const colUnit = L + W * 0.56;
    const colBase = L + W * 0.68;
    const colIva  = L + W * 0.80;
    const colTot  = L + W * 0.90;

    doc.rect(L, yPos, W, 20).fill(BLACK);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE);
    doc.text('DESCRIPCIÓN',   colDesc + 4, yPos + 7);
    doc.text('CANT.',         colQty,      yPos + 7, { width: 30, align: 'center' });
    doc.text('P.UNIT.',       colUnit,     yPos + 7, { width: 50, align: 'right' });
    doc.text('BASE IMP.',     colBase,     yPos + 7, { width: 50, align: 'right' });
    doc.text(`IVA ${invoice.tax_rate}%`, colIva, yPos + 7, { width: 40, align: 'right' });
    doc.text('TOTAL',         colTot,      yPos + 7, { width: W - (colTot - L), align: 'right' });
    yPos += 20;

    // ═══════════════════════════════════════
    //  TABLE ROWS
    // ═══════════════════════════════════════
    lineItems.forEach((item, i) => {
      const gross   = Math.abs(item.unit_price_gross);
      const net     = Math.abs(item.unit_price_net);
      const taxAmt  = gross - net;
      const qty     = item.quantity;
      const total   = Math.abs(item.line_total);
      const rowH    = 22;

      if (i % 2 === 0) doc.rect(L, yPos, W, rowH).fill('#f9f9f9');
      doc.rect(L, yPos, W, rowH).strokeColor(LGRAY).lineWidth(0.5).stroke();

      doc.fontSize(9).font('Helvetica').fillColor(BLACK);
      doc.text(item.name,           colDesc + 4, yPos + 7, { width: colQty - colDesc - 8, ellipsis: true });
      doc.text(String(qty),          colQty,      yPos + 7, { width: 30, align: 'center' });
      doc.text(fmt(gross),           colUnit,     yPos + 7, { width: 50, align: 'right' });
      doc.text(fmt(net * qty),       colBase,     yPos + 7, { width: 50, align: 'right' });
      doc.text(fmt(taxAmt * qty),    colIva,      yPos + 7, { width: 40, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(isCreditNote ? RED : BLACK)
        .text(`${isCreditNote ? '-' : ''}${fmt(total)}`, colTot, yPos + 7, { width: W - (colTot - L), align: 'right' });

      yPos += rowH;
    });

    // ═══════════════════════════════════════
    //  TOTALS
    // ═══════════════════════════════════════
    yPos += 10;
    const totW = 220;
    const totX = L + W - totW;

    const drawTotalRow = (label: string, value: string, bold = false) => {
      doc.rect(totX, yPos, totW, 20).strokeColor(LGRAY).lineWidth(0.5).stroke();
      if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      doc.fontSize(9).fillColor(BLACK).text(label, totX + 8, yPos + 6, { width: totW / 2 });
      doc.font('Helvetica-Bold').text(value, totX, yPos + 6, { width: totW - 8, align: 'right' });
      yPos += 20;
    };

    drawTotalRow('Base imponible', `${isCreditNote ? '-' : ''}${fmt(Math.abs(invoice.subtotal))}`);
    if (invoice.discount_amount > 0) {
      drawTotalRow('Descuento (cupón)', `-${fmt(invoice.discount_amount)}`);
    }
    drawTotalRow(`IVA (${invoice.tax_rate}%)`, `${isCreditNote ? '-' : ''}${fmt(Math.abs(invoice.tax_amount))}`);

    // Total row (black background)
    doc.rect(totX, yPos, totW, 26).fill(ACCENT);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
      .text('TOTAL', totX + 8, yPos + 8, { width: totW / 2 });
    doc.text(`${isCreditNote ? '-' : ''}${fmt(Math.abs(invoice.total_amount))}`, totX, yPos + 8, { width: totW - 8, align: 'right' });
    yPos += 36;

    // Notes
    if (invoice.notes) {
      yPos += 10;
      doc.rect(L, yPos, W, 40).fill('#f9f9f9');
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('NOTAS', L + 10, yPos + 8);
      doc.fontSize(9).font('Helvetica').fillColor('#444444').text(invoice.notes, L + 10, yPos + 20, { width: W - 20 });
      yPos += 50;
    }

    // ═══════════════════════════════════════
    //  FOOTER
    // ═══════════════════════════════════════
    const pageH = doc.page.height;
    doc.moveTo(L, pageH - 60).lineTo(L + W, pageH - 60).lineWidth(0.5).strokeColor(LGRAY).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
      .text('Éclat Beauty S.L. — CIF: B-XXXXXXXX', L, pageH - 50)
      .text(`Documento generado el ${fmtDate(new Date().toISOString())}`, 0, pageH - 50, { align: 'right' });

    doc.end();
  });
}

// ─────────────────────────────────────────────
// Obtener factura de la BD y prepararla como adjunto PDF para email
// ─────────────────────────────────────────────
export async function fetchInvoiceAsAttachment(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<{ content: string; name: string } | null> {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, orders!invoices_order_id_fkey(order_number)')
    .eq('id', invoiceId)
    .single();

  if (error || !inv) {
    console.error('[Invoices] Could not fetch invoice for email attachment:', error?.message);
    return null;
  }

  const orderNumber = (inv as any).orders?.order_number;
  const pdfBuffer = await generateInvoicePdf(inv as any, orderNumber);
  const content = pdfBuffer.toString('base64');
  return { content, name: `${inv.invoice_number}.pdf` };
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
