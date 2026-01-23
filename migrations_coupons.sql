-- Tabla de cupones/códigos de descuento
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' o 'fixed'
    discount_value DECIMAL(10, 2) NOT NULL, -- Porcentaje (0-100) o cantidad fija
    max_uses INTEGER, -- NULL = ilimitado
    current_uses INTEGER DEFAULT 0,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0, -- Monto mínimo de compra
    max_discount_amount DECIMAL(10, 2), -- Descuento máximo (solo para porcentaje)
    applicable_categories UUID[] DEFAULT NULL, -- Array de category IDs (NULL = todas)
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP, -- NULL = sin fecha de expiración
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);

-- Tabla para registrar uso de cupones (auditoría)
CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    user_id UUID,
    discount_applied DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage(order_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
