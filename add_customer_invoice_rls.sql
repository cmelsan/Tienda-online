-- ============================================
-- RLS ADICIONAL: clientes pueden ver sus propias facturas
-- Ejecutar en Supabase SQL Editor si ya ejecutaste migration_invoices.sql
-- ============================================

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );
