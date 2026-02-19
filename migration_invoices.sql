-- ============================================
-- SISTEMA DE FACTURACIÓN - ÉCLAT BEAUTY
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Secuencias de numeración independientes por tipo
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS credit_note_seq START 1;

-- ============================================
-- TABLA INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tipo de documento
  type VARCHAR NOT NULL CHECK (type IN ('invoice', 'credit_note')),

  -- Número oficial del documento
  -- Facturas:  FAC-2026-00001
  -- Abonos:    ABN-2026-00001
  invoice_number VARCHAR NOT NULL UNIQUE,

  -- Pedido origen
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,

  -- Solo en abonos: referencia a la factura de venta original
  reference_invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,

  -- Alcance del abono (NULL para facturas de venta)
  -- 'full'    → reembolso total del pedido
  -- 'partial' → solo algunos ítems devueltos
  credit_note_scope VARCHAR CHECK (
    credit_note_scope IS NULL OR
    credit_note_scope IN ('full', 'partial')
  ),

  -- Importes en céntimos (igual que orders.total_amount)
  -- En facturas de venta: POSITIVOS
  -- En facturas de abono: NEGATIVOS para cuadrar caja
  subtotal       INTEGER NOT NULL,         -- base imponible sin IVA
  tax_rate       NUMERIC DEFAULT 21,       -- tipo IVA aplicado (%)
  tax_amount     INTEGER NOT NULL,         -- importe IVA (positivo en venta, negativo en abono)
  discount_amount INTEGER DEFAULT 0,       -- descuento cupón si aplica (siempre positivo)
  total_amount   INTEGER NOT NULL,         -- total con IVA (+X en venta, -X en abono)

  -- Snapshot del cliente en el momento de emisión
  -- (guardamos snapshot por si luego cambia el perfil)
  customer_name    VARCHAR,
  customer_email   VARCHAR,
  customer_address JSONB,   -- copia de orders.shipping_address
  customer_nif     VARCHAR, -- para clientes empresa (opcional)

  -- Snapshot de líneas del documento
  -- SCHEMA DE line_items:
  -- [
  --   {
  --     "order_item_id": "uuid",
  --     "product_id": "uuid",
  --     "name": "Paleta Nude",
  --     "quantity": 2,
  --     "unit_price_gross": 5900,   -- precio unitario CON IVA (céntimos)
  --     "unit_price_net": 4876,     -- precio unitario SIN IVA (céntimos)
  --     "tax_rate": 21,
  --     "line_total": 11800         -- negativo en abonos
  --   }
  -- ]
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Stripe refund ID (solo en abonos, para trazabilidad)
  stripe_refund_id VARCHAR,

  issued_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes      TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_order_id        ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type            ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_ref_invoice     ON public.invoices(reference_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at       ON public.invoices(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number  ON public.invoices(invoice_number);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices viewable by admins"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Invoices insertable by admins"
  ON public.invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============================================
-- FUNCIÓN: generate_invoice_number
-- Genera el número oficial del documento
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number(invoice_type TEXT)
RETURNS TEXT AS $$
DECLARE
  year_str TEXT    := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_val  INTEGER;
  prefix   TEXT;
BEGIN
  IF invoice_type = 'invoice' THEN
    seq_val := NEXTVAL('invoice_seq');
    prefix  := 'FAC';
  ELSE
    seq_val := NEXTVAL('credit_note_seq');
    prefix  := 'ABN';
  END IF;
  RETURN prefix || '-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN RPC: create_sale_invoice
-- Crea la factura de venta cuando el pedido = 'paid'
-- Llamada desde el webhook de Stripe
-- ============================================
CREATE OR REPLACE FUNCTION public.create_sale_invoice(
  p_order_id       UUID,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order         RECORD;
  v_items         JSONB;
  v_invoice_num   TEXT;
  v_subtotal      INTEGER;
  v_tax_amount    INTEGER;
  v_total         INTEGER;
  v_invoice_id    UUID;
  v_tax_rate      NUMERIC := 21;
BEGIN
  -- Comprobar si ya existe factura de venta para este pedido
  IF EXISTS (
    SELECT 1 FROM public.invoices
    WHERE order_id = p_order_id AND type = 'invoice'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_already_exists');
  END IF;

  -- Obtener datos del pedido
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Obtener líneas del pedido con nombre del producto
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_item_id',    oi.id,
      'product_id',       oi.product_id,
      'name',             p.name,
      'quantity',         oi.quantity,
      'unit_price_gross', oi.price_at_purchase,
      'unit_price_net',   ROUND(oi.price_at_purchase / (1 + v_tax_rate / 100)),
      'tax_rate',         v_tax_rate,
      'line_total',       oi.price_at_purchase * oi.quantity
    )
  ) INTO v_items
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id;

  v_total      := v_order.total_amount;
  v_tax_amount := ROUND(v_total - (v_total / (1 + v_tax_rate / 100)));
  v_subtotal   := v_total - v_tax_amount;

  -- Generar número de factura
  v_invoice_num := public.generate_invoice_number('invoice');

  -- Insertar factura
  INSERT INTO public.invoices (
    type, invoice_number, order_id, reference_invoice_id, credit_note_scope,
    subtotal, tax_rate, tax_amount, discount_amount, total_amount,
    customer_name, customer_email, customer_address,
    line_items, issued_at
  ) VALUES (
    'invoice', v_invoice_num, p_order_id, NULL, NULL,
    v_subtotal, v_tax_rate, v_tax_amount, 0, v_total,
    v_order.customer_name,
    v_order.guest_email,
    v_order.shipping_address,
    COALESCE(v_items, '[]'::jsonb),
    NOW()
  ) RETURNING id INTO v_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN RPC: create_credit_note
-- Crea la factura de abono cuando se procesa un reembolso
-- ============================================
CREATE OR REPLACE FUNCTION public.create_credit_note(
  p_order_id          UUID,
  p_refund_amount     INTEGER,          -- importe reembolsado en céntimos (positivo)
  p_refunded_item_ids UUID[],           -- IDs de order_items reembolsados (puede ser vacío)
  p_stripe_refund_id  TEXT DEFAULT NULL,
  p_notes             TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order           RECORD;
  v_invoice         RECORD;
  v_items           JSONB;
  v_credit_num      TEXT;
  v_subtotal        INTEGER;
  v_tax_amount      INTEGER;
  v_credit_id       UUID;
  v_scope           VARCHAR;
  v_tax_rate        NUMERIC := 21;
BEGIN
  -- Obtener datos del pedido
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Obtener la factura de venta original
  SELECT * INTO v_invoice FROM public.invoices
  WHERE order_id = p_order_id AND type = 'invoice'
  LIMIT 1;

  -- Determinar alcance: total o parcial
  v_scope := CASE WHEN p_refund_amount >= v_order.total_amount THEN 'full' ELSE 'partial' END;

  -- Construir líneas del abono
  IF p_refunded_item_ids IS NOT NULL AND array_length(p_refunded_item_ids, 1) > 0 THEN
    -- Abono con ítems específicos
    SELECT jsonb_agg(
      jsonb_build_object(
        'order_item_id',    oi.id,
        'product_id',       oi.product_id,
        'name',             pr.name,
        'quantity',         oi.quantity,
        'unit_price_gross', oi.price_at_purchase,
        'unit_price_net',   ROUND(oi.price_at_purchase / (1 + v_tax_rate / 100)),
        'tax_rate',         v_tax_rate,
        'line_total',       -(oi.price_at_purchase * oi.quantity)  -- NEGATIVO
      )
    ) INTO v_items
    FROM public.order_items oi
    JOIN public.products pr ON pr.id = oi.product_id
    WHERE oi.id = ANY(p_refunded_item_ids);
  ELSE
    -- Abono sin desglose de ítems (solo importe global)
    v_items := jsonb_build_array(
      jsonb_build_object(
        'order_item_id',    NULL,
        'product_id',       NULL,
        'name',             'Reembolso pedido #' || v_order.order_number,
        'quantity',         1,
        'unit_price_gross', p_refund_amount,
        'unit_price_net',   ROUND(p_refund_amount / (1 + v_tax_rate / 100)),
        'tax_rate',         v_tax_rate,
        'line_total',       -p_refund_amount
      )
    );
  END IF;

  -- Calcular importes del abono (negativos)
  v_tax_amount := -ROUND(p_refund_amount - (p_refund_amount / (1 + v_tax_rate / 100)));
  v_subtotal   := -p_refund_amount - v_tax_amount;

  -- Generar número de abono
  v_credit_num := public.generate_invoice_number('credit_note');

  -- Insertar factura de abono
  INSERT INTO public.invoices (
    type, invoice_number, order_id, reference_invoice_id, credit_note_scope,
    subtotal, tax_rate, tax_amount, discount_amount, total_amount,
    customer_name, customer_email, customer_address,
    line_items, stripe_refund_id, notes, issued_at
  ) VALUES (
    'credit_note', v_credit_num, p_order_id,
    v_invoice.id,  -- puede ser NULL si no hay factura previa
    v_scope,
    v_subtotal, v_tax_rate, v_tax_amount, 0, -p_refund_amount,
    v_order.customer_name,
    v_order.guest_email,
    v_order.shipping_address,
    COALESCE(v_items, '[]'::jsonb),
    p_stripe_refund_id,
    p_notes,
    NOW()
  ) RETURNING id INTO v_credit_id;

  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', v_credit_id,
    'credit_note_number', v_credit_num,
    'scope', v_scope,
    'total_amount', -p_refund_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para ejecutar las funciones como usuario autenticado
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_sale_invoice(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_invoice(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, INTEGER, UUID[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, INTEGER, UUID[], TEXT, TEXT) TO service_role;

-- Permisos sobre la tabla para service_role (webhook Stripe no tiene sesión autenticada)
GRANT SELECT, INSERT ON public.invoices TO service_role;
