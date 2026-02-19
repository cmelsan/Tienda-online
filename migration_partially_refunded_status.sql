-- ============================================================
-- MIGRACIÓN: ASEGURAR SOPORTE PARA REEMBOLSOS PARCIALES
-- Fecha: 2024
-- Descripción:
--   Verifica que la tabla orders tenga soporte para:
--   - 'partially_refunded' (reembolso parcial)
--   - 'partially_returned' (devolución parcial)
--   
-- NOTA: La BD ya tiene estos estados, esta es una verificación
-- ============================================================

-- 1. Ver estados distintos en la tabla
SELECT DISTINCT status FROM orders ORDER BY status;

-- 2. Verificar constraint actual
SELECT t.constraint_name
FROM information_schema.table_constraints AS t
WHERE t.table_name = 'orders' AND t.constraint_type = 'CHECK';

-- 3. Si el constraint existe, eliminarlo (para reemplazarlo con uno completo)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 4. Agregar el constraint con TODOS los estados soportados
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'awaiting_payment', 
    'paid', 
    'shipped', 
    'delivered', 
    'cancelled', 
    'return_requested', 
    'returned', 
    'refunded',
    'partially_returned',
    'partially_refunded'
));

-- 5. Confirmar que el constraint está en lugar
SELECT 'Migración completada exitosamente' as status;
