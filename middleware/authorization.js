/**
 * Role-based authorization middleware
 */

/**
 * Check if user has required role
 * @param {...string} allowedRoles - Allowed roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to access this resource.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
  return authorize('admin')(req, res, next);
};

/**
 * Check if user is staff
 */
const isStaff = (req, res, next) => {
  return authorize('staff', 'admin')(req, res, next);
};

/**
 * Check if user is customer
 */
const isCustomer = (req, res, next) => {
  return authorize('customer', 'admin')(req, res, next);
};

/**
 * Check if user owns the resource
 */
const ownsResource = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.id === req.params.userId || req.user.id === req.params.id) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'You do not have permission to access this resource.',
  });
};

module.exports = {
  authorize,
  isAdmin,
  isStaff,
  isCustomer,
  ownsResource,
};
