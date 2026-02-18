-- Migration para agregar tabla de auditoría de reembolsos
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS refunds_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_refund_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_refunds_order_id ON refunds_log(order_id);
CREATE INDEX idx_refunds_stripe_id ON refunds_log(stripe_refund_id);
CREATE INDEX idx_refunds_admin_id ON refunds_log(admin_id);
CREATE INDEX idx_refunds_created_at ON refunds_log(created_at DESC);

-- Configurar RLS (Row Level Security)
ALTER TABLE refunds_log ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver todos los reembolsos, otros solo sus órdenes
CREATE POLICY "Admins can view all refunds" ON refunds_log
  FOR SELECT
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Política: Solo admins pueden insertar reembolsos
CREATE POLICY "Admins can create refunds" ON refunds_log
  FOR INSERT
  WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Comentario descriptivo
COMMENT ON TABLE refunds_log IS 'Audit trail for all refunds processed through Stripe API';
COMMENT ON COLUMN refunds_log.stripe_refund_id IS 'Stripe refund ID for correlation with Stripe dashboard';
COMMENT ON COLUMN refunds_log.amount IS 'Refund amount in USD (or store currency)';
COMMENT ON COLUMN refunds_log.admin_id IS 'Admin user who processed the refund';
