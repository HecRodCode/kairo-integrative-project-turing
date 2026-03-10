/**
 * backend-node/services/emailService.js
 * Resend integration — sends OTP verification emails.
 *
 * Install: npm install resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'Kairo <onboarding@resend.dev>';

// ── Generate 6-digit numeric code ─────────────────────────────
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Send OTP email ─────────────────────────────────────────────
export async function sendOtpEmail(toEmail, code, userName = '') {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${code} — Código de verificación Kairo`,
    html: buildOtpEmailHtml(code, userName),
  });

  if (error) {
    console.error('[emailService] Resend error:', JSON.stringify(error));
    throw new Error('Failed to send OTP email');
  }

  return data;
}

// ── Email HTML ─────────────────────────────────────────────────
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
        <!-- Header -->
        <tr>
          <td style="
            background:linear-gradient(135deg,#0f0c29 0%,#1a1035 100%);
            padding:32px 40px; text-align:center;
            border-bottom:1px solid rgba(168,85,247,0.15);
            border-radius:20px 20px 0 0;
          ">
            <div style="
              width:52px; height:52px; margin:0 auto 14px;
              background:rgba(168,85,247,0.12);
              border:1px solid rgba(168,85,247,0.35);
              border-radius:14px; display:flex; align-items:center; justify-content:center;
            ">
              <img src="https://i.ibb.co/placeholder/logo.png" alt=""
                style="width:28px; height:28px; display:block;" onerror="this.style.display='none'" />
            </div>
            <div style="
              font-size:22px; font-weight:800; color:#f8fafc;
              letter-spacing:-0.5px;
            ">Kairo</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">
              Plataforma de Aprendizaje · Riwi
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="font-size:18px; font-weight:700; color:#f8fafc; margin:0 0 10px;">
              ${userName ? `Hola ${userName},` : 'Hola,'} verifica tu cuenta
            </h2>
            <p style="font-size:14px; color:#94a3b8; line-height:1.7; margin:0 0 32px;">
              Ingresa el siguiente código en la pantalla de verificación.
              Expira en <strong style="color:#f8fafc;">5 minutos</strong>.
            </p>
            <!-- Code -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>${digitBoxes}</tr>
            </table>
            <p style="font-size:12px; color:#475569; text-align:center; line-height:1.7; margin:0;">
              Si no creaste una cuenta en Kairo, ignora este correo.<br/>
              Nunca compartimos ni pedimos este código.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="
            padding:18px 40px; text-align:center;
            border-top:1px solid rgba(168,85,247,0.1);
            border-radius:0 0 20px 20px;
          ">
            <p style="font-size:11px; color:#334155; margin:0;">
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
