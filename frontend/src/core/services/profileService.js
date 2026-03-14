/**
 * src/core/services/profileService.js
 *
 * Provides a small cache layer for /api/profile requests so that
 * navigating between profile-related UI components doesn't repeatedly
 * trigger the same backend fetch.
 */

import { cachedFetch, invalidateFetchCache } from '../utils/fetchCache.js';
import { API_BASE } from '../config.js';

const PROFILE_TTL = 10_000; // 10s

const ProfileCacheKeys = {
  me: `${API_BASE}/profile`,
  byId: (id) => `${API_BASE}/profile/${id}`,
};

export const profileService = {
  getMyProfile() {
    return cachedFetch(
      ProfileCacheKeys.me,
      { credentials: 'include' },
      PROFILE_TTL
    );
  },

  getProfileById(id) {
    return cachedFetch(
      ProfileCacheKeys.byId(id),
      { credentials: 'include' },
      PROFILE_TTL
    );
  },

  invalidateMyProfile() {
    invalidateFetchCache(ProfileCacheKeys.me);
  },

  invalidateProfileById(id) {
    invalidateFetchCache(ProfileCacheKeys.byId(id));
  },

  async updateProfile(payload) {
    const res = await fetch(`${API_BASE}/profile/update`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      // invalidate cache so the UI re-requests fresh data
      this.invalidateAll();
    }

    return res;
  },

  invalidateAll() {
    invalidateFetchCache(ProfileCacheKeys.me);
  },
};
