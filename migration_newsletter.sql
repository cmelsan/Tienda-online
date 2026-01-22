-- Tabla para Suscriptores de Newsletter
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Habilitar RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Políticas
-- El público puede insertar (suscribirse)
CREATE POLICY "Public enable insert newsletter" 
ON newsletter_subscribers FOR INSERT 
WITH CHECK (true);

-- Solo Admin puede ver la lista
CREATE POLICY "Admin view newsletter" 
ON newsletter_subscribers FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');
