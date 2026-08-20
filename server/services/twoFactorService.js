const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client using Service Role Key or Anon Key
const supabaseUrl = process.env.SUPABASE_URL || 'https://sjujcjvmjaqqstpdldsj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_PPmQk6Lyn3H7QApDy0YhoA_zi3xB3_e';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Supabase PostgreSQL Challenge Store (Table: public.login_otp_challenges)
const otpStore = {
  // Get active OTP challenge for a user
  async get(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('login_otp_challenges')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      // Check if challenge is expired (expires_at)
      if (new Date() > new Date(data.expires_at)) {
        await this.del(userId);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        otpHash: data.otp_hash,
        attempts: data.attempts || 0,
        expiresAt: data.expires_at,
        lastSentAt: data.last_sent_at
      };
    } catch (err) {
      console.warn('[Supabase OTP Table Get Error]:', err.message);
      return null;
    }
  },

  // Save or update OTP challenge (UPSERT into public.login_otp_challenges)
  async set(userId, { otpHash, attempts = 0, ttlSeconds = 300 }) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (ttlSeconds * 1000)).toISOString();
      const lastSentAt = now.toISOString();

      const { error } = await supabaseAdmin
        .from('login_otp_challenges')
        .upsert(
          {
            user_id: userId,
            otp_hash: otpHash,
            attempts: attempts,
            expires_at: expiresAt,
            last_sent_at: lastSentAt,
            created_at: now.toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[Supabase OTP Table Upsert Error]:', error.message);
        throw error;
      }
    } catch (err) {
      console.error('[Supabase OTP Table Set Exception]:', err.message);
      throw err;
    }
  },

  // Update attempt count in public.login_otp_challenges
  async updateAttempts(userId, newAttempts) {
    try {
      await supabaseAdmin
        .from('login_otp_challenges')
        .update({ attempts: newAttempts })
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[Supabase OTP Update Attempts Error]:', err.message);
    }
  },

  // Delete challenge (One-Time Use or Invalidation)
  async del(userId) {
    try {
      await supabaseAdmin
        .from('login_otp_challenges')
        .delete()
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[Supabase OTP Table Delete Error]:', err.message);
    }
  }
};

// Cryptographically Secure 6-digit OTP Generator (crypto.randomInt)
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// HMAC-SHA256 Cryptographic Hash (OTP is NEVER stored plaintext)
function hashOTP(otp, secret = process.env.OTP_HASH_SECRET || 'haka_2fa_secure_secret_hash_key_2026') {
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

// Brevo Transactional Email REST API v3 (POST https://api.brevo.com/v3/smtp/email)
async function sendBrevoOTPEmail(recipientEmail, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'onboarding@resend.dev';
  const senderName = process.env.BREVO_SENDER_NAME || 'HAKA Auto';

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 28px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">HAKA AUTO</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px; font-weight: 500;">Login Verification</p>
      </div>
      
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        We received a request to sign in to your HAKA Auto account.
      </p>

      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <p style="color: #475569; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Your verification code is:</p>
        <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #2563eb; font-family: monospace;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 14px;">This code will expire in <strong>5 minutes</strong>.</p>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center; margin-bottom: 24px;">
        Do not share this verification code with anyone. If you did not attempt to sign in, you can ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; font-weight: 500;">
        HAKA Auto Careers Hub &bull; Secured with 2FA & Audit Logging
      </p>
    </div>
  `;

  if (!apiKey) {
    console.log(`\n==================================================`);
    console.log(`[BREVO API NOTICE]: BREVO_API_KEY is not set in server/.env.`);
    console.log(`[DEVELOPMENT 2FA OTP CODE]: Verification code for ${recipientEmail} is: ${otp}`);
    console.log(`==================================================\n`);
    return { success: true, mode: 'dev_console_fallback', messageId: 'dev-mode' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail }],
        subject: 'HAKA Auto - Login Verification Code',
        htmlContent: htmlContent
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Brevo REST API Success] 2FA OTP Email sent to ${recipientEmail}! Message ID: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } else {
      const errText = await response.text();
      console.error('[Brevo REST API Error]:', errText);
      console.log(`\n[DEV OTP FALLBACK]: Verification code for ${recipientEmail} is: ${otp}\n`);
      return { success: true, mode: 'dev_fallback', reason: errText };
    }
  } catch (err) {
    console.error('[Brevo REST API Exception]:', err.message);
    console.log(`\n[DEV OTP FALLBACK]: Verification code for ${recipientEmail} is: ${otp}\n`);
    return { success: true, mode: 'dev_fallback', reason: err.message };
  }
}

// Log Security Audit Event to Supabase security_audit_logs
async function logSecurityAudit({ action, status, email, userId, description }) {
  if (!supabaseUrl || !supabaseServiceKey) return;

  try {
    await supabaseAdmin
      .from('security_audit_logs')
      .insert({
        actor_user_id: userId || null,
        actor_email: email || null,
        target_user_id: userId || null,
        action: action,
        status: status || 'success',
        description: description || null,
        user_agent: 'HAKA-Auto-2FA-Backend/1.0',
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.warn('[Security Audit Logging Error]:', err.message);
  }
}

module.exports = {
  otpStore,
  generateOTP,
  hashOTP,
  sendBrevoOTPEmail,
  logSecurityAudit
};
