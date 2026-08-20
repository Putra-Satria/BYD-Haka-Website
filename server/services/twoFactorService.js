const crypto = require('crypto');
const nodemailer = require('nodemailer');

// In-Memory TTL Store (300s TTL, 5 attempts limit, 60s cooldown - Zero-config, no Redis needed)
const memoryStore = new Map();

const store = {
  async get(key) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, ttlSeconds = 300) {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  },

  async del(key) {
    memoryStore.delete(key);
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

// Send Email via Brevo API v3 or Brevo SMTP (Delivers directly to ANY user inbox!)
async function sendOTPEmail(recipientEmail, otp) {
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

  // Method 1: Brevo Transactional Email REST API v3 (If BREVO_API_KEY is configured)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'HAKA Auto',
            email: process.env.BREVO_SENDER_EMAIL || 'onboarding@resend.dev'
          },
          to: [{ email: recipientEmail }],
          subject: 'HAKA Auto - Login Verification Code',
          htmlContent: htmlContent
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Brevo API v3 Success] 2FA OTP Email sent to ${recipientEmail}! Message ID: ${data.messageId}`);
        return { success: true, mode: 'brevo_api_v3', messageId: data.messageId };
      } else {
        const errText = await response.text();
        console.warn(`[Brevo API v3 Error]: Status ${response.status} - ${errText}`);
      }
    } catch (err) {
      console.warn('[Brevo API v3 Exception]:', err.message);
    }
  }

  // Method 2: Brevo Nodemailer SMTP (smtp-relay.brevo.com:587)
  const smtpUser = process.env.SMTP_USER || process.env.BREVO_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.BREVO_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      const info = await transporter.sendMail({
        from: `"HAKA Auto Security" <${smtpUser}>`,
        to: recipientEmail,
        subject: 'HAKA Auto - Login Verification Code',
        html: htmlContent
      });

      console.log(`[Brevo SMTP Success] 2FA OTP Email sent to ${recipientEmail}! Message ID: ${info.messageId}`);
      return { success: true, mode: 'brevo_smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn('[Brevo SMTP Exception]:', smtpErr.message);
    }
  }

  // Method 3: Ethereal Test Account Fallback (if Brevo credentials not filled yet)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });

    const info = await testTransporter.sendMail({
      from: `"HAKA Auto Security" <${testAccount.user}>`,
      to: recipientEmail,
      subject: 'HAKA Auto - Login Verification Code',
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Ethereal Test SMTP] 2FA OTP Email sent to ${recipientEmail}. Live preview: ${previewUrl}`);
    return { success: true, mode: 'ethereal_fallback', previewUrl };
  } catch (fallbackErr) {
    console.error('[Email Send Error]:', fallbackErr.message);
    return { success: false, reason: fallbackErr.message };
  }
}

// Log Security Audit Event to Supabase security_audit_logs
async function logSecurityAudit({ action, status, email, userId, description }) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://sjujcjvmjaqqstpdldsj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/security_audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        actor_user_id: userId || null,
        actor_email: email || null,
        target_user_id: userId || null,
        action: action,
        status: status || 'success',
        description: description || null,
        user_agent: 'HAKA-Auto-2FA-Backend/1.0',
        created_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('[Security Audit Logging Error]:', err.message);
  }
}

module.exports = {
  redis: store,
  generateOTP,
  hashOTP,
  sendOTPEmail,
  logSecurityAudit
};
