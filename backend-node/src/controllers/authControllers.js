import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';
import { generateOtpCode, sendOtpEmail } from '../services/email.service.js';

/* ══════════════════════════════════════════════════════════════
   REGISTER
   Creates user, sends OTP. Does NOT create session yet —
   session starts only after OTP is verified.
══════════════════════════════════════════════════════════════ */
export const register = async (req, res) => {
  const { email, password, fullName, role, clan } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        full_name: fullName,
        role: role || 'coder',
        clan,
        first_login: true,
      })
      .select('id, email, full_name, role, clan, first_login')
      .single();

    if (error) {
      // 23505 = unique_violation (email already exists)
      if (error.code === '23505')
        return res.status(409).json({ error: 'El correo ya está registrado.' });
      throw error;
    }

    try {
      await _createAndSendOtp(email, fullName);
    } catch (emailErr) {
      console.error(
        '[register] OTP send failed (non-fatal):',
        emailErr.message
      );
      // Non-blocking — user can request resend on the OTP page
    }

    return res.status(201).json({
      message: 'Cuenta creada. Verifica tu correo.',
      email: newUser.email,
    });
  } catch (error) {
    console.error('[register]', error.message);
    return res.status(500).json({ error: 'Error al registrar el usuario.' });
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
        'id, email, password, full_name, role, clan, first_login, otp_verified'
      )
      .eq('email', email)
      .single();

    if (error || !user)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    // ── BUG FIX 2: Block unverified manual accounts ────────────
    // OAuth users (Google/GitHub) are always considered verified.
    // Manual users must complete OTP before accessing the app.
    if (!user.otp_verified) {
      // Re-send a fresh OTP so the user doesn't have to click resend
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

    // ── BUG FIX 3: Include firstLogin + clan in response ───────
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('[login] Session save error:', err);
        return res.status(500).json({ error: 'Error al iniciar sesión.' });
      }
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          clan: user.clan,
          firstLogin: user.first_login, // ← redirectByRole uses this
        },
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
    return res
      .status(400)
      .json({ error: 'Email y código de 6 dígitos son requeridos.' });

  try {
    const { data: record, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_email', email)
      .eq('otp_code', code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !record)
      return res.status(400).json({ error: 'Código incorrecto o expirado.' });

    // Check attempt limit (stored in DB)
    if ((record.attempts || 0) >= 5)
      return res
        .status(429)
        .json({ error: 'Demasiados intentos. Solicita un nuevo código.' });

    // Mark OTP as used
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', record.id);

    // Mark user as verified
    await supabase
      .from('users')
      .update({ otp_verified: true })
      .eq('email', email);

    // Fetch full user to start session
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name, role, clan, first_login')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('[verifyOtp] Session save error:', err);
        return res.status(500).json({ error: 'Error al iniciar sesión.' });
      }
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          clan: user.clan,
          firstLogin: user.first_login,
        },
      });
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
    const { data: user } = await supabase
      .from('users')
      .select('full_name, otp_verified')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.otp_verified)
      return res.status(400).json({ error: 'El correo ya está verificado.' });

    // Rate limit: max 3 codes per 10 min
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('otp_verifications')
      .select('id', { count: 'exact' })
      .eq('user_email', email)
      .gte('created_at', tenMinsAgo);

    if (count >= 3)
      return res.status(429).json({
        error:
          'Demasiadas solicitudes. Espera 10 minutos antes de pedir otro código.',
      });

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
  try {
    const { error } = await supabase
      .from('users')
      .update({ first_login: false })
      .eq('id', req.session.userId);
    if (error) throw error;
    return res
      .status(200)
      .json({ success: true, message: 'Onboarding completado.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar estado.' });
  }
};

export const updateUserProfile = async (req, res) => {
  const { fullName, clan } = req.body;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName, clan })
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
  if (!req.session?.userId)
    return res.status(401).json({ authenticated: false });
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
        clan: user.clan,
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
  await supabase
    .from('otp_verifications')
    .insert({
      user_email: email,
      otp_code: code,
      expires_at: expiresAt,
      attempts: 0,
    });

  // Send via Resend
  await sendOtpEmail(email, code, userName);
}
