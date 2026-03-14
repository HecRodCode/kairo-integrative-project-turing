import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { generateOtpCode, sendOtpEmail } from '../services/email.service.js';

const OTP_EXPIRY = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/* OTP CORE LOGIC */
async function createOtpRecord(email, code) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY).toISOString();

  try {
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('user_email', email)
      .eq('is_used', false);

    const { error } = await supabase.from('otp_verifications').insert({
      user_email: email,
      otp_code: code,
      expires_at: expiresAt,
      attempts: 0,
      is_used: false,
    });

    if (error) throw error;
  } catch (err) {
    console.error('[OTP Internal Error]:', err.message);
    throw err;
  }
}

/* AUTH FLOWS (Register, Login, Verify) */
export const register = async (req, res) => {
  const { email, password, fullName, role, clanId } = req.body;

  if (email === 'riosrodriguezhectorhernan59@gmail.com') {
    return res
      .status(403)
      .json({ error: 'Email reservado para administración.' });
  }

  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const code = generateOtpCode();

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        full_name: fullName,
        role: role || 'coder',
        clan: clanId || null,
        otp_verified: false,
        first_login: true,
      })
      .select()
      .single();

    if (userError) throw userError;

    await createOtpRecord(email, code);

    await sendOtpEmail(email, code, fullName);

    res.status(201).json({
      message: 'Código enviado ✓',
      email,
      ttl: OTP_EXPIRY / 1000,
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    res.status(500).json({ error: 'Error en el proceso de registro.' });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  try {
    const { data: record, error: otpErr } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_email', email)
      .eq('otp_code', code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (otpErr || !record) {
      return res.status(400).json({ error: 'Código incorrecto o expirado.' });
    }

    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', record.id);

    const { data: user, error: userUpdErr } = await supabase
      .from('users')
      .update({ otp_verified: true })
      .eq('email', email)
      .select()
      .single();

    if (userUpdErr) throw userUpdErr;

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Error de sesión.' });
      req.session.userId = user.id;
      res.json({ success: true, user });
    });
  } catch (error) {
    console.error('[VerifyOtp Error]:', error);
    res.status(500).json({ error: 'Error de verificación.' });
  }
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const code = generateOtpCode();
    await createOtpRecord(email, code);
    await sendOtpEmail(email, code, '');
    res.json({ success: true, message: 'Código reenviado ✓' });
  } catch (error) {
    console.error('[ResendOtp Error]:', error);
    res.status(500).json({ error: 'Error al reenviar código.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*, otp_verified, first_login')
      .eq('email', email)
      .single();

    if (userErr || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!user.otp_verified) {
      const code = generateOtpCode();
      await createOtpRecord(email, code);
      await sendOtpEmail(email, code, user.full_name);

      return res.status(403).json({
        requiresOtp: true,
        error: 'Verifica tu correo primero.',
        email: user.email,
      });
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Error login.' });
      req.session.userId = user.id;
      res.json({ success: true, user });
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: 'Error en el servidor.' });
  }
};

/* SESSION & AUTH STATUS */
export const checkAuth = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, clan, first_login')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) return res.status(401).json({ authenticated: false });

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        clanId: user.clan,
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error de servidor.' });
  }
};

export const getCurrentUser = checkAuth;

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Error al cerrar sesión.' });
    res.clearCookie('riwi.sid');
    return res.status(200).json({ message: 'Sesión cerrada.' });
  });
};

/* PROFILE & ONBOARDING */
export const updateFirstLoginStatus = async (req, res) => {
  const { clanId } = req.body;
  if (!req.session.userId)
    return res.status(401).json({ error: 'No autorizado' });

  try {
    const updateData = { first_login: false };
    if (clanId) updateData.clan = clanId;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.session.userId);

    if (error) throw error;
    return res
      .status(200)
      .json({ success: true, message: 'Onboarding completado.' });
  } catch (error) {
    console.error('[UpdateStatus Error]:', error.message);
    return res.status(500).json({ error: 'Error al actualizar estado.' });
  }
};

export const updateUserProfile = async (req, res) => {
  const { fullName, clanId } = req.body;
  if (!req.session.userId)
    return res.status(401).json({ error: 'No autorizado' });

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName, clan: clanId })
      .eq('id', req.session.userId)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, user: data });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar perfil.' });
  }
};

/* SOCIAL AUTH (Google / GitHub)*/

export const socialAuthSuccess = (req, res) => {
  if (!req.user) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/src/views/auth/login.html?error=auth_failed`
    );
  }

  req.session.userId = req.user.id;

  req.session.save((err) => {
    if (err) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/src/views/auth/login.html?error=session_error`
      );
    }

    supabase
      .from('users')
      .update({ otp_verified: true })
      .eq('id', req.user.id)
      .then(() => {
        const base = process.env.FRONTEND_URL;
        const dest = req.user.first_login
          ? `${base}/src/views/coder/onboarding.html`
          : `${base}/src/views/coder/dashboard.html`;

        return res.redirect(dest);
      });
  });
};
