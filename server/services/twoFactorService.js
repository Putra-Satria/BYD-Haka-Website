const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Zero-Config High-Reliability In-Memory TTL Store (Replaces Redis requirement)
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

// Singleton Ethereal Test Account Cache for Zero-Config Local Dev Testing
let etherealTransporter = null;

async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // 1. Custom User-Configured SMTP (e.g. Gmail App Password / Brevo SMTP / Custom Mail Server)
  if (user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port: port,
        secure: port === 465,
        auth: { user, pass }
      }),
      fromEmail: user,
      mode: 'smtp_custom'
    };
  }

  // 2. Zero-Config Auto Ethereal SMTP Engine (100% Free for any recipient)
  if (!etherealTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      etherealTransporter.fromEmail = testAccount.user;
    } catch (err) {
      console.warn('[Ethereal SMTP Error]:', err.message);
    }
  }

  if (etherealTransporter) {
    return {
      transporter: etherealTransporter,
      fromEmail: etherealTransporter.fromEmail || 'security@hakaauto.com',
      mode: 'ethereal_free'
    };
  }

  return null;
}

// Send 2FA Email via Nodemailer SMTP
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

  try {
    const transportObj = await getTransporter();
    if (!transportObj) return { success: false, reason: 'NO_SMTP_TRANSPORTER' };

    const { transporter, fromEmail, mode } = transportObj;
    const info = await transporter.sendMail({
      from: `"HAKA Auto Security" <${fromEmail}>`,
      to: recipientEmail,
      subject: 'HAKA Auto - Login Verification Code',
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[SMTP 2FA OTP Email Sent to ${recipientEmail}] Preview live email online: ${previewUrl}`);
    } else {
      console.log(`[SMTP 2FA OTP Email Sent to ${recipientEmail}] Message ID: ${info.messageId}`);
    }

    return {
      success: true,
      mode: mode,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    };
  } catch (err) {
    console.error('[SMTP Send Email Exception]:', err.message);
    return { success: false, reason: err.message };
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
