/**
 * src/core/services/profileService.js
 */

import { cachedFetch, invalidateFetchCache } from '../utils/fetchCache.js';
import { API_BASE } from '../config.js';

const PROFILE_TTL = 10_000;

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
