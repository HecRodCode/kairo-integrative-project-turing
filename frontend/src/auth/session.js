/* Session Management and RBAC */
export const sessionManager = {
  saveUser: (user) => localStorage.setItem('kairo_user', JSON.stringify(user)),

  getUser: () => JSON.parse(localStorage.getItem('kairo_user')),

  logout: () => {
    localStorage.removeItem('kairo_user');
    window.location.href = '/index.html';
  },

  redirectByRole: (user) => {
    if (!user || !user.role) return;
    const role = user.role.toLowerCase().trim();

    if (role === 'tl' || role === 'trainer') {
      window.location.href = '/frontend/views/tl/dashboard.html';
    } else {
      window.location.href = user.firstLogin
        ? '/frontend/views/coder/onboarding.html'
        : '/frontend/views/coder/dashboard.html';
    }
  },
};
