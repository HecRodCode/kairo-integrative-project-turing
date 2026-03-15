/**
 * services/email.service.js
 */
import { Resend } from 'resend';
import { query } from '../config/database.js';

let resend = null;
const FROM_EMAIL = process.env.SMTP_FROM || 'Kairo <onboarding@resend.dev>';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

if (!process.env.RESEND_API_KEY) {
  console.error(
    '[emailService] ❌ Missing RESEND_API_KEY — OTP emails will fail'
  );
}

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(toEmail, code, userName = '') {
  const resendClient = getResendClient();
  if (!resendClient) {
    throw new Error('RESEND_API_KEY not configured');
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${code} is your Kairo verification code`,
      html: buildOtpEmailHtml(code, userName),
      text: `Your Kairo verification code is: ${code}. It expires in 15 minutes.`,
    });

    if (error) throw new Error(error.message);

    console.log(`[emailService] ✅ OTP sent to ${toEmail} — ID: ${data?.id}`);
    return data;
  } catch (error) {
    console.error(
      `[emailService] ❌ Delivery failed to ${toEmail}:`,
      error.message
    );
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}

export async function cleanupExpiredOtps() {
  try {
    const result = await query(
      `DELETE FROM otp_verifications
       WHERE expires_at < NOW() AND is_used = false`
    );
    const count = result.rowCount || 0;
    console.log(`[emailService] 🧹 Purged ${count} expired OTP records`);
    return count;
  } catch (error) {
    console.error('[emailService] ❌ Cleanup failed:', error.message);
    throw error;
  }
}

export async function testEmailConnection() {
  const isConfigured = !!process.env.RESEND_API_KEY;
  return {
    status: isConfigured ? 'OK' : 'ERROR',
    connected: isConfigured,
    sender: FROM_EMAIL,
  };
}

/**
 * HTML email OTP.
 */
function buildOtpEmailHtml(code, userName) {
  const digitBoxes = code
    .split('')
    .map(
      (d) => `
      <td style="width:48px;height:56px;text-align:center;background:#16162a;border:1px solid rgba(168,85,247,0.35);border-radius:10px;font-family:monospace;font-size:28px;font-weight:700;color:#f8fafc;">${d}</td>
      <td style="width:8px"></td>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#050505;font-family:sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="500" style="background:#0a0a0a;border-radius:20px;border:1px solid rgba(168,85,247,0.2);">
        <tr>
          <td style="padding:30px;text-align:center;background:linear-gradient(135deg,#0f0c29,#1a1035);border-radius:20px 20px 0 0;">
            <div style="font-size:24px;font-weight:800;color:#f8fafc;">Kairo</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#f8fafc;margin:0 0 10px;">
              ${userName ? `Hello ${userName},` : 'Hello,'} verify your account
            </h2>
            <p style="color:#94a3b8;font-size:14px;margin-bottom:30px;">
              Enter the code below to complete your registration.
            </p>
            <table align="center"><tr>${digitBoxes}</tr></table>
            <p style="color:#475569;font-size:12px;margin-top:40px;text-align:center;">
              This code expires in 15 minutes. Do not share it with anyone.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
