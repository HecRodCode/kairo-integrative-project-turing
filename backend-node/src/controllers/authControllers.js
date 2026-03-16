/**
 * controllers/authControllers.js
 */
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { generateOtpCode, sendOtpEmail } from '../services/email.service.js';

const OTP_EXPIRY_MS = 15 * 60 * 1000;

/* ── OTP helpers ── */
async function createOtpRecord(email, code) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
  // Overrides previous codes
  await query(
    `UPDATE otp_verifications SET is_used = true WHERE user_email = $1 AND is_used = false`,
    [email]
  );
  await query(
    `INSERT INTO otp_verifications (user_email, otp_code, expires_at, attempts, is_used)
     VALUES ($1, $2, $3, 0, false)`,
    [email, code, expiresAt]
  );
}

/* ── Register ── */
export const register = async (req, res) => {
  const { email, password, fullName, role, clanId } = req.body;
  try {
    const { rows } = await query(
      `SELECT id, otp_verified FROM users WHERE email = $1`,
      [email]
    );
    const existing = rows[0];

    if (existing?.otp_verified) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await query(
        `INSERT INTO users (email, password, full_name, role, clan, otp_verified, first_login)
         VALUES ($1, $2, $3, $4, $5, false, true)`,
        [email, hashedPassword, fullName, role || 'coder', clanId || null]
      );
    }

    const code = generateOtpCode();
    await createOtpRecord(email, code);
    await sendOtpEmail(email, code, fullName);

    res.status(201).json({
      message: 'Verification code sent.',
      email,
      ttl: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    res.status(500).json({ error: 'Registration process failed.' });
  }
};

/* ── Verify OTP ── */
export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  try {
    const { rows } = await query(
      `SELECT * FROM otp_verifications
       WHERE user_email = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email, code]
    );
    const record = rows[0];

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }

    await query(`UPDATE otp_verifications SET is_used = true WHERE id = $1`, [
      record.id,
    ]);

    const { rows: userRows } = await query(
      `UPDATE users SET otp_verified = true WHERE email = $1
       RETURNING id, email, full_name, role, clan AS clan_id, first_login`,
      [email]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found after OTP update');

    // req.login expects the same object that findById returns
    req.login(user, (err) => {
      if (err)
        return res
          .status(500)
          .json({ error: 'Session initialization failed.' });
      req.session.userId = user.id;
      res.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          role: user.role,
          clanId: user.clan_id,
          firstLogin: user.first_login,
        },
      });
    });
  } catch (error) {
    console.error('[VerifyOtp Error]:', error);
    res.status(500).json({ error: 'Verification failed.' });
  }
};

/* ── Resend OTP ── */
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const { rows } = await query(
      `SELECT full_name, otp_verified FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.otp_verified)
      return res
        .status(400)
        .json({ error: 'Email already verified. Please login.' });

    const newCode = generateOtpCode();
    await createOtpRecord(email, newCode);
    await sendOtpEmail(email, newCode, user.full_name);

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent.',
      ttl: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error('[ResendOtp Error]:', error.message);
    res.status(500).json({ error: 'Failed to resend code.' });
  }
};

/* ── Login ── */
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = rows[0];

    // OAuth users do not have a hashable password
    const isOAuthUser = user?.password?.startsWith('oauth_');
    const passwordValid =
      !isOAuthUser && user && (await bcrypt.compare(password, user.password));

    if (!user || isOAuthUser || !passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.otp_verified) {
      const code = generateOtpCode();
      await createOtpRecord(email, code);
      await sendOtpEmail(email, code, user.full_name);
      return res.status(403).json({
        requiresOtp: true,
        error: 'Please verify your email first.',
        email: user.email,
      });
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed.' });
      req.session.userId = user.id;
      res.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          role: user.role,
          clanId: user.clan,
          firstLogin: user.first_login,
        },
      });
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

/* ── checkAuth — valida req.user (passport) O session.userId ── */
export const checkAuth = async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(401).json({ authenticated: false });

  try {
    const { rows } = await query(
      `SELECT id, email, full_name, role, clan AS clan_id, first_login
       FROM users WHERE id = $1`,
      [userId]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ authenticated: false });

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        clanId: user.clan_id,
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error checking auth.' });
  }
};

/* ── Logout ── */
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Could not log out.' });
    res.clearCookie('riwi.sid');
    return res.status(200).json({ message: 'Session closed.' });
  });
};

/* ── Social Auth Callback  ── */
export const socialAuthSuccess = async (req, res) => {
  if (!req.user) {
    return res.redirect(
      `${process.env.FRONTEND_URL}${process.env.FRONTEND_VIEWS_PATH || ''}/auth/login.html?error=auth_failed`
    );
  }

  req.session.userId = req.user.id;

  try {
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    // Set otp_verified for OAuth users
    await query(`UPDATE users SET otp_verified = true WHERE id = $1`, [
      req.user.id,
    ]);

    const base = process.env.FRONTEND_URL;
    const views = process.env.FRONTEND_VIEWS_PATH || '/frontend/src/views';
    const dest = req.user.first_login
      ? `${base}${views}/coder/onboarding.html`
      : `${base}${views}/coder/dashboard.html`;

    return res.redirect(dest);
  } catch (err) {
    console.error('[SocialAuthSuccess Error]:', err);
    return res.redirect(
      `${process.env.FRONTEND_URL}${process.env.FRONTEND_VIEWS_PATH || ''}/auth/login.html?error=session_error`
    );
  }
};

/* ── updateFirstLoginStatus ── */
export const updateFirstLoginStatus = async (req, res) => {
  const { clanId } = req.body;
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await query(
      `UPDATE users SET first_login = false, clan = $2 WHERE id = $1`,
      [userId, clanId || null]
    );
    return res
      .status(200)
      .json({ success: true, message: 'Onboarding completed.' });
  } catch (error) {
    console.error('[UpdateStatus Error]:', error.message);
    return res.status(500).json({ error: 'Failed to update status.' });
  }
};

/* ── updateUserProfile ── */
export const updateUserProfile = async (req, res) => {
  const { fullName, clanId } = req.body;
  const userId = req.user?.id || req.session?.userId;

  if (!userId)
    return res.status(401).json({ error: 'Unauthorized: No session found' });
  if (!fullName && !clanId)
    return res.status(400).json({ error: 'At least one field required' });

  try {
    const sets = [];
    const vals = [];
    if (fullName) {
      sets.push(`full_name = $${sets.length + 1}`);
      vals.push(fullName);
    }
    if (clanId) {
      sets.push(`clan = $${sets.length + 1}`);
      vals.push(clanId);
    }
    vals.push(userId);

    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
       RETURNING id, email, full_name, role, clan AS clan_id`,
      vals
    );
    const updated = rows[0];
    return res.status(200).json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        role: updated.role,
        clanId: updated.clan_id,
      },
    });
  } catch (error) {
    console.error('[UpdateProfile Error]:', error.message);
    return res
      .status(500)
      .json({ error: 'Failed to update profile information' });
  }
};
