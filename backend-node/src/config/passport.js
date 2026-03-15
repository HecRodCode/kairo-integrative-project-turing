/**
 * config/passport.js
 */
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findByEmail, createOAuth, findById } from '../models/user.js';

const isProduction = !!(
  process.env.RAILWAY_PUBLIC_DOMAIN || process.env.NODE_ENV === 'production'
);

const BASE_URL = isProduction
  ? 'https://kairo-integrative-project-turing-production.up.railway.app'
  : `http://localhost:${process.env.PORT || 3000}`;

console.log(
  `[Passport] OAuth BASE_URL: ${BASE_URL} (production: ${isProduction})`
);

/* ── Serialize / Deserialize ── */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* ── GitHub Strategy ── */
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.warn(
    '[Passport] GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET no configurados — GitHub OAuth deshabilitado.'
  );
} else {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.find((e) => e.primary)?.value ||
            profile.emails?.[0]?.value ||
            `github_${profile.id}@noreply.github.com`;

          let user = await findByEmail(email);
          if (!user) {
            user = await createOAuth({
              email,
              fullName: profile.displayName || profile.username || 'Riwi Coder',
              provider: 'github',
              providerId: profile.id,
            });
          }
          return done(null, user);
        } catch (err) {
          console.error('[Passport GitHub] Error:', err.message);
          return done(err, null);
        }
      }
    )
  );
  console.log(
    `[Passport] GitHub OAuth → callback: ${BASE_URL}/api/auth/github/callback`
  );
}

/* ── Google Strategy ── */
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    '[Passport] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados — Google OAuth deshabilitado.'
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(
              new Error('Google no devolvió email — verifica los scopes'),
              null
            );
          }

          let user = await findByEmail(email);
          if (!user) {
            user = await createOAuth({
              email,
              fullName: profile.displayName || 'Riwi Coder',
              provider: 'google',
              providerId: profile.id,
            });
          }
          return done(null, user);
        } catch (err) {
          console.error('[Passport Google] Error:', err.message);
          return done(err, null);
        }
      }
    )
  );
  console.log(
    `[Passport] Google OAuth → callback: ${BASE_URL}/api/auth/google/callback`
  );
}

export default passport;
