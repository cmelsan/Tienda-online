import { supabase, getAdminSupabaseClient } from '@/lib/supabase';
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

    // Use admin client to bypass RLS restrictions
    const adminClient = getAdminSupabaseClient();
    const queryClient = adminClient || supabase;

    // Strategy 1: Try to find user in auth.users table directly
    console.log('[ForgotPassword] Step 1: Searching in auth.users table...');
    console.log('[ForgotPassword] Using:', adminClient ? 'admin client (bypasses RLS)' : 'public client (subject to RLS)');
    
    // Get admin auth API
    let authUser = null;
    if (adminClient) {
      // Use admin auth API to list users and find by email
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      
      if (listError) {
        console.error('[ForgotPassword] Error listing users:', listError.message);
      } else {
        console.log('[ForgotPassword] Total users in auth.users:', users?.length || 0);
        // Find user with matching email
        authUser = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (authUser) {
          console.log('[ForgotPassword] Found user in auth.users:', authUser.id, 'Email:', authUser.email);
        }
      }
    }

    // Also check profiles as fallback
    if (!authUser) {
      console.log('[ForgotPassword] Step 2: Searching in profiles table as fallback...');
      const { data: allProfiles, error: allError } = await queryClient
        .from('profiles')
        .select('id, email');
      
      console.log('[ForgotPassword] Total profiles in DB:', allProfiles?.length || 0);
      if (allProfiles && allProfiles.length > 0) {
        console.log('[ForgotPassword] First few profiles:');
        allProfiles.slice(0, 3).forEach((p: any) => {
          console.log(`  - ID: ${p.id}, Email: "${p.email}"`);
        });
        
        // Manual filter with case-insensitive match
        const foundProfile = allProfiles.find((p: any) => 
          p.email && p.email.toLowerCase() === email.toLowerCase()
        );
        
        if (foundProfile) {
          authUser = { id: foundProfile.id, email: foundProfile.email };
        }
      }
    }

    if (authUser) {
      userId = authUser.id;
      userEmail = authUser.email;
    }

    console.log('[ForgotPassword] User lookup result:', {
      found: !!userId,
      userId,
      userEmail,
      searchedFor: email,
    });

    if (!userId || !userEmail) {
      console.log('[ForgotPassword] User not found in auth.users or profiles table');
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

    // Save token to database (use admin client to ensure it works)
    const { error: insertError } = await queryClient
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
