/**
 * config/passport.js
 * Passport strategies for Google and GitHub OAuth.
 * The verify callback resolves the user from YOUR database,
 * so serializeUser always stores your DB user, never the raw OAuth profile.
 */

import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findByEmail, create, findById } from '../models/user.js';

/* ── Serialize: store only the DB user id in the session ── */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/* ── Deserialize: rebuild req.user from DB on every request ── */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* GITHUB STRATEGY */
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/auth/github/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `github_${profile.id}@noreply.github.com`;

        let user = await findByEmail(email);

        if (!user) {
          user = await create({
            email,
            password: `social_auth_github_${profile.id}`,
            fullName: profile.displayName || profile.username || 'Riwi Coder',
            role: 'coder',
            clan: null,
            first_login: true,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

/* GOOGLE STRATEGY */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email returned from Google'), null);
        }

        let user = await findByEmail(email);

        if (!user) {
          user = await create({
            email,
            password: `social_auth_google_${profile.id}`,
            fullName: profile.displayName || 'Riwi Coder',
            role: 'coder',
            clan: null,
            first_login: true,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
