import type { APIRoute } from 'astro';
import { getAdminSupabaseClient } from '@/lib/supabase';

function buildPage(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ÉCLAT Beauty</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: white; border: 1px solid #e5e7eb; padding: 56px 48px; text-align: center; max-width: 440px; width: 100%; }
    .icon { font-size: 40px; margin-bottom: 24px; }
    .brand { font-size: 11px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: #9ca3af; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: black; margin-bottom: 16px; }
    p { color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 32px; }
    a { display: inline-block; background: black; color: white; padding: 14px 28px; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; transition: background 0.2s; }
    a:hover { background: #ec4899; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✓' : '✗'}</div>
    <p class="brand">ÉCLAT Beauty</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Ir a la tienda</a>
  </div>
</body>
</html>`;
}

export const GET: APIRoute = async (context) => {
  const token = context.url.searchParams.get('token');

  if (!token) {
    return new Response(
      buildPage('Enlace inválido', 'El enlace de desuscripción no es válido. Si crees que es un error, contáctanos.', false),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Use service-role client to bypass RLS on the update
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    return new Response(
      buildPage('Error', 'Error de configuración del servidor. Contáctanos.', false),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Use the subscriber's UUID id as the token
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ is_active: false })
    .eq('id', token);

  if (error) {
    console.error('[Newsletter Unsubscribe] Error:', error);
    return new Response(
      buildPage('Error', 'No hemos podido procesar tu solicitud. Por favor inténtalo de nuevo o contáctanos.', false),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return new Response(
    buildPage(
      'Desuscripción completada',
      'Has sido eliminado de nuestra lista de newsletter. Ya no recibirás más correos de ÉCLAT Beauty. Siempre puedes volver a suscribirte desde nuestra tienda.',
      true
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
};
