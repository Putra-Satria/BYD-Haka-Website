const crypto = require('crypto');

// In-Memory Fallback TTL Store for Local Dev when Upstash Redis variables are not configured
const memoryStore = new Map();

// Upstash Redis REST wrapper with High-Reliability Local Fallback
const redis = {
  async get(key) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        const res = await fetch(`${url}/get/${key}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.result ? JSON.parse(data.result) : null;
      } catch (err) {
        console.warn('[Upstash Redis] REST fetch failed, using memory fallback:', err.message);
      }
    }

    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, ttlSeconds = 300) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        await fetch(`${url}/set/${key}/${encodeURIComponent(JSON.stringify(value))}/EX/${ttlSeconds}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return;
      } catch (err) {
        console.warn('[Upstash Redis] REST set failed, using memory fallback:', err.message);
      }
    }

    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  },

  async del(key) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        await fetch(`${url}/del/${key}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('[Upstash Redis] REST del failed:', err.message);
      }
    }

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

// Brevo Transactional Email API Delivery
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
    console.warn('[Brevo API Warning] BREVO_API_KEY is not configured in server/.env.');
    return { success: false, reason: 'BREVO_API_KEY_MISSING' };
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
      return { success: true, messageId: data.messageId };
    } else {
      const errText = await response.text();
      console.error('[Brevo API Error]:', errText);
      return { success: false, reason: errText };
    }
  } catch (err) {
    console.error('[Brevo Fetch Exception]:', err.message);
    return { success: false, reason: err.message };
  }
}

// Log Security Audit Event to Supabase security_audit_logs
// CRITICAL: NEVER log OTP, plain string, or sensitive data in description
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
  redis,
  generateOTP,
  hashOTP,
  sendBrevoOTPEmail,
  logSecurityAudit
};
