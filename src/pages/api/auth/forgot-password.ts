import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/brevo';
import { randomBytes } from 'crypto';

const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export async function POST({ request }: any) {
  try {
    const body = await request.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return new Response(JSON.stringify({ error: 'Email requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Clean and normalize email
    const email = rawEmail.trim().toLowerCase();
    
    console.log('[ForgotPassword] Received password reset request for:', email);

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY).toISOString();

    console.log('[ForgotPassword] Generated token, saving to database');

    // Save token to database with email only (no user_id required)
    // The email is the key identifier here
    const { error: insertError, data } = await supabase
      .from('password_reset_tokens')
      .insert({
        email: email,
        token: resetToken,
        expires_at: expiresAt,
      })
      .select();

    if (insertError) {
      console.error('[ForgotPassword] Database insert error:', insertError);
      // Still send success response for security (don't reveal if email exists)
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[ForgotPassword] Token saved successfully');

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

    console.log('[ForgotPassword] Sending email to:', email);

    try {
      const sendResult = await sendEmail({
        to: email,
        subject: 'Recupera tu contraseña en ÉCLAT',
        htmlContent: emailContent,
      });

      console.log('[ForgotPassword] Email send result:', sendResult);

      if (!sendResult.success) {
        console.error('[ForgotPassword] Email send failed:', sendResult.error);
        // Still return success for security
      }
    } catch (emailError) {
      console.error('[ForgotPassword] Email sending exception:', emailError);
      // Still return success for security
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ForgotPassword] General error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
