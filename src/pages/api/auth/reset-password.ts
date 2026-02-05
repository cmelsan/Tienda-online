import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/brevo';

export async function POST({ request }: any) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'Token y contraseña requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find and validate token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !resetToken) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if token has expired
    if (new Date(resetToken.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expirado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use RPC function to reset password
    // This function handles finding the user by email and resetting the password
    console.log('[ResetPassword] Calling RPC function to reset password');
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'reset_password_with_token',
      {
        p_token: token,
        p_new_password: password
      }
    );

    if (rpcError || !rpcResult?.success) {
      console.error('[ResetPassword] RPC error:', rpcError?.message || rpcResult?.message);
      return new Response(JSON.stringify({ 
        error: rpcResult?.message || 'Error al resetear contraseña' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[ResetPassword] Password reset successful for user:', rpcResult.user_id);

    // Send confirmation email
    const emailContent = `
      <p>Hola,</p>
      <p>Tu contraseña en ÉCLAT ha sido cambiada exitosamente.</p>
      <p>Si no realizaste este cambio, por favor contacta a nuestro equipo de soporte inmediatamente.</p>
      <p><strong>Información de seguridad:</strong></p>
      <ul>
        <li>Cambio realizado el: ${new Date().toLocaleString('es-ES')}</li>
        <li>Si no fuiste tú, resetea tu contraseña nuevamente desde: <a href="${process.env.PUBLIC_SITE_URL}/recuperar-contrasena">Recuperar Contraseña</a></li>
      </ul>
      <p>Saludos,<br>Equipo ÉCLAT</p>
    `;

    try {
      const sendResult = await sendEmail({
        to: resetToken.email,
        subject: 'Tu contraseña en ÉCLAT ha sido cambiada',
        htmlContent: emailContent,
      });

      if (!sendResult.success) {
        console.error('[ResetPassword] Confirmation email send failed:', sendResult.error);
      }
    } catch (emailError) {
      console.error('[ResetPassword] Confirmation email exception:', emailError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Contraseña actualizada exitosamente' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
