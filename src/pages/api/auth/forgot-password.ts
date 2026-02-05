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

    let userId: string | null = null;
    let userEmail: string | null = null;

    // Strategy 1: Try to find user in profiles table (main registered users table)
    console.log('[ForgotPassword] Step 1: Searching in profiles table...');
    
    // First, let's try to get ALL profiles to debug
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, email');
    
    console.log('[ForgotPassword] Total profiles in DB:', allProfiles?.length || 0);
    if (allProfiles && allProfiles.length > 0) {
      console.log('[ForgotPassword] First few profiles:');
      allProfiles.slice(0, 3).forEach((p: any) => {
        console.log(`  - ID: ${p.id}, Email: "${p.email}"`);
      });
    }

    // Now search for the specific email
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, email');
    
    if (searchError) {
      console.error('[ForgotPassword] Error querying profiles:', searchError);
    }

    // Manual filter with case-insensitive match
    let foundProfile = null;
    if (profiles && profiles.length > 0) {
      foundProfile = profiles.find((p: any) => 
        p.email && p.email.toLowerCase() === email.toLowerCase()
      );
    }

    if (foundProfile) {
      userId = foundProfile.id;
      userEmail = foundProfile.email;
      console.log('[ForgotPassword] Found user in profiles:', userId, 'Email:', userEmail);
    }

    console.log('[ForgotPassword] User lookup result:', {
      found: !!userId,
      userId,
      userEmail,
      searchedFor: email,
    });

    if (!userId || !userEmail) {
      console.log('[ForgotPassword] User not found in profiles table');
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

    console.log('[ForgotPassword] Generated token, inserting into DB with userId:', userId);

    // Save token to database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        email: userEmail,
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

    console.log('[ForgotPassword] Sending email to:', userEmail);

    try {
      const sendResult = await sendEmail({
        to: userEmail,
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
