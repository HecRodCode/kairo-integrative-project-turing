/**
 * Middleware to check if user is authenticated
 */
export function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required',
    message: 'Please login to access this resource',
  });
}

/**
 * Middleware to check if user has specific role
 */
export function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.session.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
}
