import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { generateOtpCode, sendOtpEmail } from '../services/email.service.js';

/* ══════════════════════════════════════════════════════════════
   REGISTER
   Creates user, sends OTP. Does NOT create session yet —
   session starts only after OTP is verified.
══════════════════════════════════════════════════════════════ */
export const register = async (req, res) => {
  const { email, password, fullName, role, clanId } = req.body;
  try {
    // Check if user already exists in DB
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateOtpCode();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Stage registration in session
    req.session.pendingRegistration = {
      email,
      password: hashedPassword,
      fullName,
      role: role || 'coder',
      clan: clanId,
      otp: {
        code,
        expiresAt,
        attempts: 0
      }
    };

    try {
      await sendOtpEmail(email, code, fullName);
    } catch (emailErr) {
      console.error('[register] OTP send failed:', emailErr.message);
      // We still proceed, user can resend from the UI
    }

    return res.status(201).json({
      message: 'Código enviado. Verifica tu correo para completar el registro.',
      email
    });
  } catch (error) {
    console.error('[register]', error.message);
    return res.status(500).json({ error: 'Error al iniciar el registro.' });
  }
};

/* ══════════════════════════════════════════════════════════════
   LOGIN
   BUG FIX 2: Check OTP verification before allowing access.
   BUG FIX 3: Return firstLogin + clan so redirectByRole works.
══════════════════════════════════════════════════════════════ */
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, email, password, full_name, role, clan_id:clan, first_login, otp_verified'
      )
      .eq('email', email)
      .single();

    if (error || !user)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    if (!user.otp_verified) {
      try {
        await _createAndSendOtp(email, user.full_name);
      } catch (e) {
        console.error('[login] OTP resend on blocked login failed:', e.message);
      }

      return res.status(403).json({
        requiresOtp: true,
        error:
          'Debes verificar tu correo antes de ingresar. Te enviamos un nuevo código.',
      });
    }

    req.login(user, (err) => {
      if (err) {
        console.error('[login] Passport login error:', err);
        return res.status(500).json({ error: 'Error al iniciar sesión.' });
      }

      req.session.userId = user.id;

      req.session.save((err) => {
        if (err) console.error('[login] Session save error:', err);

        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            clanId: user.clan_id,
            firstLogin: user.first_login,
          },
        });
      });
    });
  } catch (error) {
    console.error('[login]', error.message);
    return res.status(500).json({ error: 'Error en el login.' });
  }
};

/* ══════════════════════════════════════════════════════════════
   SOCIAL AUTH SUCCESS (Google / GitHub)
   OAuth users skip OTP — considered verified on arrival.
══════════════════════════════════════════════════════════════ */
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

    // Mark OAuth users as otp_verified (they authenticated via provider)
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

/* ══════════════════════════════════════════════════════════════
   VERIFY OTP
   Marks OTP as used, marks user as otp_verified, starts session.
══════════════════════════════════════════════════════════════ */
export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code || code.length !== 6)
    return res.status(400).json({ error: 'Email y código son requeridos.' });

  try {
    const pending = req.session.pendingRegistration;

    // CASE 1: Pending registration in session
    if (pending && pending.email === email) {
      if (pending.otp.code !== code) {
        pending.otp.attempts++;
        if (pending.otp.attempts >= 5) {
          delete req.session.pendingRegistration;
          return res.status(429).json({ error: 'Demasiados intentos. Regístrate de nuevo.' });
        }
        return res.status(400).json({ error: 'Código incorrecto.' });
      }

      if (Date.now() > pending.otp.expiresAt) {
        return res.status(400).json({ error: 'El código ha expirado.' });
      }

      // CODE VALID -> Create user in DB
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: pending.email,
          password: pending.password,
          full_name: pending.fullName,
          role: pending.role,
          clan: pending.clan,
          otp_verified: true,
          first_login: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // START SESSION
      req.login(newUser, (err) => {
        if (err) return res.status(500).json({ error: 'Error al iniciar sesión.' });
        
        req.session.userId = newUser.id;
        delete req.session.pendingRegistration;

        // Force session save to avoid race conditions on redirect
        req.session.save((err) => {
          if (err) console.error('[verifyOtp] Session save error:', err);
          
          return res.status(200).json({
            success: true,
            user: {
              id: newUser.id,
              email: newUser.email,
              fullName: newUser.full_name,
              role: newUser.role,
              clanId: newUser.clan, // already aliased or direct column
              firstLogin: newUser.first_login
            }
          });
        });
      });
      return;
    }

    // CASE 2: User already exists, just verifying unverified account (legacy/login fallback)
    const { data: record, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_email', email)
      .eq('otp_code', code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !record)
      return res.status(400).json({ error: 'Código incorrecto o expirado.' });

    await supabase.from('otp_verifications').update({ is_used: true }).eq('id', record.id);
    await supabase.from('users').update({ otp_verified: true }).eq('email', email);

    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Error al iniciar sesión.' });
      req.session.userId = user.id;
      return res.status(200).json({ success: true, user });
    });
  } catch (error) {
    console.error('[verifyOtp]', error.message);
    return res.status(500).json({ error: 'Error de verificación.' });
  }
};

/* ══════════════════════════════════════════════════════════════
   RESEND OTP
   Rate limited: max 3 per 10 minutes.
══════════════════════════════════════════════════════════════ */
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido.' });

  try {
    // Check pending session first
    const pending = req.session.pendingRegistration;
    if (pending && pending.email === email) {
      const code = generateOtpCode();
      pending.otp.code = code;
      pending.otp.expiresAt = Date.now() + 15 * 60 * 1000;
      pending.otp.attempts = 0;

      await sendOtpEmail(email, code, pending.fullName);
      return res.status(200).json({ success: true, message: 'OTP reenviado.' });
    }

    // Fallback to DB for existing users
    const { data: user } = await supabase
      .from('users')
      .select('full_name, otp_verified')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.otp_verified)
      return res.status(400).json({ error: 'El correo ya está verificado.' });

    await _createAndSendOtp(email, user.full_name);
    return res.status(200).json({ success: true, message: 'OTP reenviado.' });
  } catch (error) {
    console.error('[resendOtp]', error.message);
    return res.status(500).json({ error: 'Error al reenviar el código.' });
  }
};

/* ══════════════════════════════════════════════════════════════
   ONBOARDING / PROFILE
══════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════
   SESSION
══════════════════════════════════════════════════════════════ */
export const checkAuth = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, clan_id:clan, first_login')
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
        clanId: user.clan_id,
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
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Sesión cerrada.' });
  });
};

/* ══════════════════════════════════════════════════════════════
   PRIVATE: _createAndSendOtp
   Invalidates previous OTPs, inserts new one, sends email.
══════════════════════════════════════════════════════════════ */
async function _createAndSendOtp(email, userName = '') {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Invalidate all previous unused codes for this email
  await supabase
    .from('otp_verifications')
    .update({ is_used: true })
    .eq('user_email', email)
    .eq('is_used', false);

  // Insert fresh code
  await supabase.from('otp_verifications').insert({
    user_email: email,
    otp_code: code,
    expires_at: expiresAt,
    attempts: 0,
  });

  // Send via Resend
  await sendOtpEmail(email, code, userName);
}
