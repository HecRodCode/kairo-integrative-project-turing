import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { generateOtpCode, sendOtpEmail } from '../services/email.service.js';

const OTP_EXPIRY = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/* OTP CORE - SINGLE RESPONSIBILITY  */
async function createOtpRecord(email, code) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY).toISOString();

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
  });

  if (error) throw error;
}

/* REGISTER */
export const register = async (req, res) => {
  const { email, password, fullName, role, clanId } = req.body;
  
  try {
    const { data: existingUser } = await supabase
      .from('users').select('id').eq('email', email).single();
    
    if (existingUser) {
      return res.status(409).json({ error: 'Correo ya registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({ 
        email, 
        password: hashedPassword, 
        full_name: fullName, 
        role: role || 'coder', 
        clan: clanId,
        otp_verified: false,
        first_login: true 
      })
      .select()
      .single();
    
    if (userError) throw userError;

    const code = generateOtpCode();
    await createOtpRecord(email, code);
    
    req.session.pendingRegistration = {
      email, password: hashedPassword, fullName,
      role: role || 'coder', clan: clanId,
      otp: { code, expiresAt: Date.now() + OTP_EXPIRY, attempts: 0 },
      userId: newUser.id
    };

    await sendOtpEmail(email, code, fullName);
    
    res.status(201).json({ 
      message: 'Código enviado ✓', 
      email,
      ttl: OTP_EXPIRY / 1000 
    });
  } catch (error) {
    console.error('[register]', error);
    res.status(500).json({ error: 'Error en registro' });
  }
};


/* VERIFY OTP - DB autoridad + Session sync */
export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  try {
    // 1. DB AUTORIDAD (incluso sin session)
    const { data: record } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_email', email)
      .eq('otp_code', code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!record) {
      return res.status(400).json({ error: 'Código incorrecto/expirado' });
    }

    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', record.id);

    const pending = req.session.pendingRegistration;

    if (pending && pending.email === email) {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: pending.email,
          password: pending.password,
          full_name: pending.fullName,
          role: pending.role,
          clan: pending.clan,
          otp_verified: true,
          first_login: true,
        })
        .select()
        .single();

      if (error) throw error;

      req.login(newUser, (err) => {
        if (err) return res.status(500).json({ error: 'Error sesión' });
        delete req.session.pendingRegistration;
        res.json({ success: true, user: newUser });
      });
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await supabase
      .from('users')
      .update({ otp_verified: true })
      .eq('email', email);

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Error login' });
      req.session.userId = user.id;
      res.json({ success: true, user });
    });
  } catch (error) {
    console.error('[verifyOtp]', error);
    res.status(500).json({ error: 'Error verificación' });
  }
};

/*  RESEND OTP - Sync DB+Session */
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const code = generateOtpCode();

    await createOtpRecord(email, code);

    const pending = req.session.pendingRegistration;
    if (pending && pending.email === email) {
      pending.otp.code = code;
      pending.otp.expiresAt = Date.now() + OTP_EXPIRY;
      pending.otp.attempts = 0;
    }

    await sendOtpEmail(email, code, '');
    res.json({ success: true, message: 'Código reenviado ✓' });
  } catch (error) {
    console.error('[resendOtp]', error);
    res.status(500).json({ error: 'Error reenvío' });
  }
};

/*  LOGIN - Limpiado */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*, otp_verified, first_login')
      .eq('email', email)
      .single();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.otp_verified) {
      const code = generateOtpCode();
      await createOtpRecord(email, code);
      await sendOtpEmail(email, code, user.full_name);

      return res.status(403).json({
        requiresOtp: true,
        error: 'Verifica tu correo primero',
      });
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Error login' });
      req.session.userId = user.id;
      res.json({ success: true, user });
    });
  } catch (error) {
    console.error('[login]', error);
    res.status(500).json({ error: 'Error login' });
  }
};

/* SESSION & USER */
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

/* ONBOARDING & PROFILE  */
export const updateFirstLoginStatus = async (req, res) => {
  const { clanId } = req.body;
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
    console.error('[updateFirstLoginStatus] Error:', error.message);
    return res.status(500).json({ error: 'Error al actualizar estado.' });
  }
};

export const updateUserProfile = async (req, res) => {
  const { fullName, clanId } = req.body;
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

/* SOCIAL AUTH  */
export const socialAuthSuccess = (req, res) => {
  if (!req.user)
    return res.redirect(
      `${process.env.FRONTEND_URL}/src/views/auth/login.html?error=auth_failed`
    );

  req.session.userId = req.user.id;
  req.session.save((err) => {
    if (err)
      return res.redirect(
        `${process.env.FRONTEND_URL}/src/views/auth/login.html?error=session_error`
      );

    supabase
      .from('users')
      .update({ otp_verified: true })
      .eq('id', req.user.id)
      .then(() => {});

    const base = process.env.FRONTEND_URL;
    const dest = req.user.first_login
      ? `${base}/src/views/coder/onboarding.html`
      : `${base}/src/views/coder/dashboard.html`;

    return res.redirect(dest);
  });
};
