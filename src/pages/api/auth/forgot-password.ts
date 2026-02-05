import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/brevo';
import { randomBytes } from 'crypto';

const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export async function POST({ request }: any) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from Supabase auth using email
    const { data: userData, error: getUserError } = await supabase.auth.admin.listUsers();

    if (getUserError) {
      return new Response(JSON.stringify({ error: 'Error al buscar usuario' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For security, don't reveal if email exists
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY).toISOString();

    // Save token to database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: user.email,
        token: resetToken,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return new Response(JSON.stringify({ error: 'Error al procesar la solicitud' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send reset email via Brevo
    const resetUrl = `${process.env.PUBLIC_SITE_URL}/resetear-contrasena/${resetToken}`;
    
    const emailContent = `
      <p>Hola,</p>
      <p>Recibimos una solicitud para resetear tu contraseña. Haz clic en el enlace de abajo para continuar:</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; font-weight: bold;">Resetear Contraseña</a></p>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p>${resetUrl}</p>
      <p>Este enlace expirará en 24 horas.</p>
      <p>Si no solicitaste este cambio, ignora este email.</p>
      <p>Saludos,<br>Equipo ÉCLAT</p>
    `;

    await sendEmail({
      to: user.email || '',
      subject: 'Recupera tu contraseña en ÉCLAT',
      html: emailContent,
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email de recuperación enviado' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
