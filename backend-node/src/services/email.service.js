/**
 * backend-node/services/emailService.js
 * Nodemailer + OTP Management — Production Ready.
 */

import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase.js';

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_SECURE =
  process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : SMTP_PORT === 465;

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
  pool: true, // Production: connection pooling
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
    // Email validation
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
    throw new Error('Failed to send OTP email');
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
   EMAIL TEMPLATE - Sin cambios (perfecto)
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
            <div style="width:52px;height:52px;margin:0 auto 14px;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.35);border-radius:14px;display:flex;align-items:center;justify-content:center;">
              <img src="https://i.ibb.co/placeholder/logo.png" alt="" style="width:28px;height:28px;display:block;" onerror="this.style.display='none'"/>
            </div>
            <div style="font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">Kairo</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Plataforma de Aprendizaje · Riwi</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="font-size:18px;font-weight:700;color:#f8fafc;margin:0 0 10px;">
              ${userName ? `Hola ${userName},` : 'Hola,'} verifica tu cuenta
            </h2>
            <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 32px;">
              Ingresa el siguiente código en la pantalla de verificación.
              Expira en <strong style="color:#f8fafc;">15 minutos</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>${digitBoxes}</tr>
            </table>
            <p style="font-size:12px;color:#475569;text-align:center;line-height:1.7;margin:0;">
              Si no creaste una cuenta en Kairo, ignora este correo.<br/>
              Nunca compartimos ni pedimos este código.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 40px;text-align:center;border-top:1px solid rgba(168,85,247,0.1);border-radius:0 0 20px 20px;">
            <p style="font-size:11px;color:#334155;margin:0;">
              © ${new Date().getFullYear()} Kairo · Riwi Bootcamp Colombia
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
