/**
 * backend-node/controllers/profileControllers.js
 * PostgreSQL: datos personales + skills + moodle stats
 * MongoDB (ProfileMetadata): avatar, experience, education — non-fatal
 */
import { query } from '../config/database.js';
import { ensureMongoConnected } from '../config/mongodb.js';
import ProfileMetadata from '../models/ProfileMetadata.js';

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */

/**
 * Lee metadata de MongoDB de forma segura.
 * Si Mongo no está disponible retorna el objeto vacío por defecto.
 */
async function getMongoMetadata(userId) {
  const available = await ensureMongoConnected();
  if (!available) return { avatar_url: null, experience: [], education: [] };

  try {
    const found = await ProfileMetadata.findOne({ user_id: Number(userId) });
    return {
      avatar_url: found?.avatar_url ?? null,
      experience: found?.experience ?? [],
      education: found?.education ?? [],
    };
  } catch (err) {
    console.warn('[getMongoMetadata] Error (non-fatal):', err.message);
    return { avatar_url: null, experience: [], education: [] };
  }
}

/**
 * Guarda metadata en MongoDB de forma segura.
 * Retorna true si guardó, false si no disponible.
 */
async function saveMongoMetadata(userId, update) {
  if (!Object.keys(update).length) return true;

  const available = await ensureMongoConnected();
  if (!available) {
    console.warn(
      '[saveMongoMetadata] MongoDB no disponible — avatar/exp/edu no guardados'
    );
    return false;
  }

  try {
    await ProfileMetadata.findOneAndUpdate(
      { user_id: Number(userId) },
      { $set: { ...update, updated_at: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return true;
  } catch (err) {
    console.warn('[saveMongoMetadata] Error (non-fatal):', err.message);
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════
   GET PROFILE
══════════════════════════════════════════════════════════════ */
export const getProfile = async (req, res) => {
  const userId = req.params.id || req.user?.id;
  if (!userId) return res.status(400).json({ error: 'User ID requerido' });

  try {
    // Autorización
    if (req.params.id && req.params.id !== String(req.user?.id)) {
      if (req.user?.role === 'coder') {
        return res
          .status(403)
          .json({ error: 'No tienes permisos para ver este perfil' });
      }
      if (req.user?.role === 'tl') {
        const [targetRes, tlRes] = await Promise.all([
          query('SELECT role, clan FROM users WHERE id = $1', [userId]),
          query('SELECT clan FROM users WHERE id = $1', [req.user.id]),
        ]);
        const target = targetRes.rows[0];
        if (!target || target.role !== 'coder') {
          return res
            .status(403)
            .json({ error: 'Solo puedes ver perfiles de coders' });
        }
        if (target.clan !== tlRes.rows[0]?.clan) {
          return res
            .status(403)
            .json({ error: 'Solo puedes ver coders de tu clan' });
        }
      }
    }

    // Queries en paralelo: Postgres + Mongo simultáneos
    const [[profileResult, statsResult, moodleResult], mongoData] =
      await Promise.all([
        Promise.all([
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
          query(
            `SELECT u.role, u.clan AS clan_id, COUNT(c.id) AS coders
           FROM users u
           LEFT JOIN users c ON c.clan = u.clan AND c.role = 'coder' AND c.is_active = true
           WHERE u.id = $1
           GROUP BY u.role, u.clan`,
            [userId]
          ),
          query(
            `SELECT current_week, average_score
           FROM moodle_progress
           WHERE coder_id = $1
           ORDER BY updated_at DESC
           LIMIT 1`,
            [userId]
          ),
        ]),
        getMongoMetadata(userId),
      ]);

    if (!profileResult.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const u = profileResult.rows[0];
    const s = statsResult.rows[0] || {};
    const m = moodleResult.rows[0] || null;

    const stats =
      u.role === 'tl' && u.clan_id
        ? { clans: 1, coders: parseInt(s.coders) || 0 }
        : { clans: 0, coders: 0 };

    return res.json({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      clanId: u.clan_id,
      stats,
      personalInfo: {
        phone: u.phone || '',
        location: u.location || '',
        birthDate: u.birth_date || '',
        bio: u.bio || '',
      },
      socials: {
        github: u.github_url || '',
        linkedin: u.linkedin_url || '',
        twitter: u.twitter_url || '',
        portfolio: u.portfolio_url || '',
      },
      metadata: {
        avatarUrl: mongoData.avatar_url,
        skills: u.skills || [],
        experience: mongoData.experience,
        education: mongoData.education,
      },
      progress: {
        currentWeek: m?.current_week ?? 1,
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

  const { personalInfo, socials, metadata = {} } = req.body;
  const skills = Array.isArray(metadata.skills) ? metadata.skills : undefined;

  try {
    // 1. Postgres — solo si viene personalInfo, socials o skills
    const hasPostgresData = personalInfo || socials || skills !== undefined;

    if (hasPostgresData) {
      // Lee valores actuales para no sobreescribir con nulls en auto-save de avatar
      const current = await query(
        `SELECT phone, location, birth_date, bio,
                github_url, linkedin_url, twitter_url, portfolio_url,
                COALESCE(skills, '[]'::jsonb) AS skills
         FROM user_profiles WHERE user_id = $1`,
        [userId]
      );
      const cur = current.rows[0] || {};

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
          personalInfo?.phone ?? cur.phone ?? null,
          personalInfo?.location ?? cur.location ?? null,
          personalInfo?.birthDate ?? cur.birth_date ?? null,
          personalInfo?.bio ?? cur.bio ?? null,
          socials?.github ?? cur.github_url ?? null,
          socials?.linkedin ?? cur.linkedin_url ?? null,
          socials?.twitter ?? cur.twitter_url ?? null,
          socials?.portfolio ?? cur.portfolio_url ?? null,
          JSON.stringify(skills ?? cur.skills ?? []),
        ]
      );
    }

    // 2. MongoDB — avatar, experience, education
    const mongoUpdate = {};
    if (metadata.avatarUrl !== undefined)
      mongoUpdate.avatar_url = metadata.avatarUrl;
    if (metadata.experience !== undefined)
      mongoUpdate.experience = metadata.experience;
    if (metadata.education !== undefined)
      mongoUpdate.education = metadata.education;

    const mongoSaved = await saveMongoMetadata(userId, mongoUpdate);

    return res.json({
      success: true,
      message: 'Perfil actualizado.',
      mongoSaved, // true si el avatar persistió, false si Mongo no estaba disponible
    });
  } catch (err) {
    console.error('[updateProfile]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
