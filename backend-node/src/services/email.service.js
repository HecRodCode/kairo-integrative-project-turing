/**
 * backend-node/services/emailService.js
 * Nodemailer + OTP Management — Production Ready (Railway Optimized).
 */

import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = false;

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM =
  process.env.SMTP_FROM ??
  (SMTP_USER ? `Kairo <${SMTP_USER}>` : 'Kairo <no-reply@kairo.local>');

if (!SMTP_USER || !SMTP_PASS) {
  console.error(
    '[emailService] ❌ SMTP_USER/SMTP_PASS missing - EMAILS DISABLED'
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth:
    SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  connectionTimeout: 10000, // 10 segundos
  greetingTimeout: 10000,
  socketTimeout: 15000,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

/* OTP GENERATION - Cryptographically secure */
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* SEND OTP - Production hardened */
export async function sendOtpEmail(toEmail, code, userName = '') {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      throw new Error('Invalid email format');
    }

    const info = await transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: `${code} — Código de verificación Kairo`,
      html: buildOtpEmailHtml(code, userName),
      text: `Tu código de verificación Kairo es: ${code}. Expira en 15 minutos.`,
    });

    console.log(
      `[emailService] ✅ OTP sent to ${toEmail} - MessageID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error('[emailService] ❌ Send failed:', error.message);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

/* CLEANUP - Production cron job */
export async function cleanupExpiredOtps() {
  try {
    const { error, count } = await supabase
      .from('otp_verifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('is_used', false);

    if (error) throw error;
    console.log(`[emailService] 🧹 Cleaned ${count || 0} expired OTPs`);
    return count || 0;
  } catch (error) {
    console.error('[emailService] Cleanup failed:', error.message);
    throw error;
  }
}

/* HEALTH CHECK - Production monitoring */
export async function testEmailConnection() {
  try {
    await transporter.verify();
    console.log('[emailService] ✅ SMTP connection OK');
    return { status: 'OK', connected: true };
  } catch (error) {
    console.error('[emailService] ❌ SMTP connection failed:', error.message);
    return { status: 'ERROR', connected: false, error: error.message };
  }
}

/* ═══════════════════════════════════════════════
   EMAIL TEMPLATE 
════════════════════════════════════════════════ */
function buildOtpEmailHtml(code, userName) {
  const digitBoxes = code
    .split('')
    .map(
      (d) => `
      <td style="
        width:48px; height:56px; text-align:center; vertical-align:middle;
        background:#16162a; border:1px solid rgba(168,85,247,0.35);
        border-radius:10px; font-family:'Courier New',monospace;
        font-size:28px; font-weight:700; color:#f8fafc; padding:0;
      ">${d}</td>
      <td style="width:8px"></td>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#050505;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 20px;">
      <table width="520" cellpadding="0" cellspacing="0" style="
        background:#0a0a0a; border-radius:20px;
        border:1px solid rgba(168,85,247,0.2);
        box-shadow:0 24px 64px rgba(0,0,0,0.6);
      ">
        <tr>
          <td style="
            background:linear-gradient(135deg,#0f0c29 0%,#1a1035 100%);
            padding:32px 40px; text-align:center;
            border-bottom:1px solid rgba(168,85,247,0.15);
            border-radius:20px 20px 0 0;
          ">
            <div style="font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">Kairo</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="font-size:18px;font-weight:700;color:#f8fafc;margin:0 0 10px;">
              ${userName ? `Hola ${userName},` : 'Hola,'} verifica tu cuenta
            </h2>
            <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 32px;">
              Ingresa el siguiente código en la pantalla de verificación.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>${digitBoxes}</tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
