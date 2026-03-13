/**
 * backend-node/controllers/profileControllers.js
 * PostgreSQL: datos personales + skills + moodle stats
 * MongoDB (ProfileMetadata): avatar, experience, education — non-fatal
 */
import { query } from '../config/database.js';
import ProfileMetadata from '../models/ProfileMetadata.js';

/* ══════════════════════════════════════════════════════════════
   GET PROFILE
══════════════════════════════════════════════════════════════ */
export const getProfile = async (req, res) => {
  const userId = req.params.id || req.user?.id;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try {
    // 1. PostgreSQL — todas las queries en paralelo
    const [profileResult, statsResult, moodleResult] = await Promise.all([

      // Perfil principal + skills
      query(
        `SELECT u.id, u.email, u.full_name, u.role, u.clan AS clan_id,
                p.phone, p.location, p.birth_date, p.bio,
                p.github_url, p.linkedin_url, p.twitter_url, p.portfolio_url,
                COALESCE(p.skills, '[]'::jsonb) AS skills
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
      ),

      // TL stats (coders en su clan)
      query(
        `SELECT u.role, u.clan AS clan_id,
                COUNT(c.id) AS coders
         FROM users u
         LEFT JOIN users c ON c.clan = u.clan AND c.role = 'coder' AND c.is_active = true
         WHERE u.id = $1
         GROUP BY u.role, u.clan`,
        [userId]
      ),

      // Moodle progress — semana actual + promedio
      query(
        `SELECT current_week, average_score
         FROM moodle_progress
         WHERE coder_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId]
      ),
    ]);

    if (!profileResult.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = profileResult.rows[0];
    const s = statsResult.rows[0] || {};
    const m = moodleResult.rows[0] || null;

    // TL stats
    let stats = { clans: 0, coders: 0 };
    if (u.role === 'tl' && u.clan_id) {
      stats = { clans: 1, coders: parseInt(s.coders) || 0 };
    }

    // 2. MongoDB — avatar, experience, education (non-fatal)
    let mongoData = { avatar_url: null, experience: [], education: [] };
    try {
      const found = await ProfileMetadata.findOne({ user_id: Number(userId) });
      if (found) {
        mongoData.avatar_url = found.avatar_url;
        mongoData.experience = found.experience || [];
        mongoData.education  = found.education  || [];
      }
    } catch (mongoErr) {
      console.warn('[getProfile] MongoDB no disponible (non-fatal):', mongoErr.message);
    }

    return res.json({
      id:       u.id,
      email:    u.email,
      fullName: u.full_name,
      role:     u.role,
      clanId:   u.clan_id,
      stats,
      personalInfo: {
        phone:     u.phone      || '',
        location:  u.location   || '',
        birthDate: u.birth_date || '',
        bio:       u.bio        || '',
      },
      socials: {
        github:    u.github_url    || '',
        linkedin:  u.linkedin_url  || '',
        twitter:   u.twitter_url   || '',
        portfolio: u.portfolio_url || '',
      },
      metadata: {
        avatarUrl:  mongoData.avatar_url,
        skills:     u.skills        || [],
        experience: mongoData.experience,
        education:  mongoData.education,
      },
      // Stats de progreso académico
      // currentWeek fallback = 1 (igual al DEFAULT del schema, no 0)
      progress: {
        currentWeek:  m?.current_week  ?? 1,
        averageScore: m ? parseFloat(m.average_score) || 0 : 0,
      },
    });
  } catch (err) {
    console.error('[getProfile]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE PROFILE
══════════════════════════════════════════════════════════════ */
export const updateProfile = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No autenticado.' });

  const { personalInfo = {}, socials = {}, metadata = {} } = req.body;
  const skills = Array.isArray(metadata.skills) ? metadata.skills : [];

  try {
    // 1. PostgreSQL — datos personales + skills (crítico)
    await query(
      `INSERT INTO user_profiles
         (user_id, phone, location, birth_date, bio,
          github_url, linkedin_url, twitter_url, portfolio_url,
          skills, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         phone         = EXCLUDED.phone,
         location      = EXCLUDED.location,
         birth_date    = EXCLUDED.birth_date,
         bio           = EXCLUDED.bio,
         github_url    = EXCLUDED.github_url,
         linkedin_url  = EXCLUDED.linkedin_url,
         twitter_url   = EXCLUDED.twitter_url,
         portfolio_url = EXCLUDED.portfolio_url,
         skills        = EXCLUDED.skills,
         updated_at    = NOW()`,
      [
        userId,
        personalInfo.phone     || null,
        personalInfo.location  || null,
        personalInfo.birthDate || null,
        personalInfo.bio       || null,
        socials.github         || null,
        socials.linkedin       || null,
        socials.twitter        || null,
        socials.portfolio      || null,
        JSON.stringify(skills),
      ]
    );

    // 2. MongoDB — avatar, experience, education (non-fatal)
    try {
      const mongoUpdate = {};
      if (metadata.avatarUrl  !== undefined) mongoUpdate.avatar_url  = metadata.avatarUrl;
      if (metadata.experience !== undefined) mongoUpdate.experience  = metadata.experience;
      if (metadata.education  !== undefined) mongoUpdate.education   = metadata.education;

      if (Object.keys(mongoUpdate).length > 0) {
        await ProfileMetadata.findOneAndUpdate(
          { user_id: userId },
          { $set: mongoUpdate },
          { upsert: true, new: true }
        );
      }
    } catch (mongoErr) {
      console.warn('[updateProfile] MongoDB no disponible (non-fatal):', mongoErr.message);
    }

    return res.json({ success: true, message: 'Perfil actualizado.' });
  } catch (err) {
    console.error('[updateProfile]', err.message);
    return res.status(500).json({ error: err.message });
  }
};