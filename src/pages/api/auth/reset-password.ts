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

    // Update user password using Supabase auth admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetToken.user_id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(JSON.stringify({ error: 'Error al actualizar la contraseña' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('id', resetToken.id);

    if (markUsedError) {
      console.error('Mark used error:', markUsedError);
    }

    // Optionally invalidate all other reset tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', resetToken.user_id)
      .neq('id', resetToken.id);

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

    await sendEmail({
      to: resetToken.email,
      subject: 'Tu contraseña en ÉCLAT ha sido cambiada',
      html: emailContent,
    });

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
