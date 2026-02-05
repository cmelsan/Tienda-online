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
    
    console.log('[ForgotPassword] Searching for user with email:', email);

    // Search for user in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email) // case-insensitive search
      .single();

    console.log('[ForgotPassword] Profile search result:', {
      profileError: profileError?.message,
      profileFound: !!profile,
      profileEmail: profile?.email
    });

    if (profileError || !profile) {
      console.log('[ForgotPassword] User not found, returning safe response');
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

    console.log('[ForgotPassword] Generated token, inserting into DB');

    // Save token to database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        email: profile.email,
        token: resetToken,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('[ForgotPassword] Database error:', insertError);
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

    console.log('[ForgotPassword] Sending email to:', profile.email);

    try {
      const sendResult = await sendEmail({
        to: profile.email,
        subject: 'Recupera tu contraseña en ÉCLAT',
        htmlContent: emailContent,
      });

      console.log('[ForgotPassword] Email send result:', sendResult);

      if (!sendResult.success) {
        console.error('[ForgotPassword] Email send failed:', sendResult.error);
      }
    } catch (emailError) {
      console.error('[ForgotPassword] Email sending exception:', emailError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email de recuperación enviado' 
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
