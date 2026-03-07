/* Session Management and RBAC (Role-Based Access Control) */
export const sessionManager = {
  // Persists the user profile object in the browser's local storage
  saveUser: (user) => localStorage.setItem('kairo_user', JSON.stringify(user)),

  // Retrieves and parses the stored user data from local storage
  getUser: () => JSON.parse(localStorage.getItem('kairo_user')),

  // Clears user session data and redirects to the landing page
  logout: () => {
    localStorage.removeItem('kairo_user');
    window.location.href = '/index.html';
  },

  // Handles conditional routing based on user permissions and account status
  redirectByRole: (user) => {
    if (!user || !user.role) return;
    const role = user.role.toLowerCase().trim();

    // Redirects Team Leaders or Trainers to their specific management dashboard
    if (role === 'tl' || role === 'trainer') {
      window.location.href = '/frontend/views/tl/dashboard.html';
    } else {
      // Coder routing logic: checks if initial onboarding is required
      window.location.href = user.firstLogin
        ? '/frontend/views/coder/onboarding.html'
        : '/frontend/views/coder/dashboard.html';
    }
  },
};
