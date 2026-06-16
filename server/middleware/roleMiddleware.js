/**
 * checkRole
 *
 * Higher-order factory that returns an Express middleware function.
 * Usage: router.post('/admin', protect, checkRole(['admin']), handler)
 *
 * @param {string[]} allowedRoles - Array of roles permitted to access the route
 * @returns {Function} Express middleware
 */
const checkRole = (allowedRoles) => {
  // ── Validate factory arguments at startup, not at request time ─────────────
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error(
      '[checkRole] allowedRoles must be a non-empty array. ' +
      'Example: checkRole(["admin", "client"])'
    );
  }

  const VALID_ROLES = new Set(['client', 'freelancer', 'admin']);
  const invalid = allowedRoles.filter((r) => !VALID_ROLES.has(r));
  if (invalid.length > 0) {
    throw new Error(
      `[checkRole] Unknown role(s) passed: ${invalid.join(', ')}. ` +
      `Valid roles are: ${[...VALID_ROLES].join(', ')}`
    );
  }

  // ── Return the actual middleware ───────────────────────────────────────────
  return (req, res, next) => {
    try {
      // protect middleware must run before checkRole
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in first.',
        });
      }

      const { role } = req.user;

      // Defensive: role field must be a non-empty string
      if (!role || typeof role !== 'string') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User role could not be determined.',
        });
      }

      // Core authorisation check
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This route requires one of the following roles: ${allowedRoles.join(', ')}.`,
        });
      }

      // Role is valid — proceed
      return next();

    } catch (err) {
      console.error('[roleMiddleware] Unexpected error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Authorization service error. Please try again later.',
      });
    }
  };
};

module.exports = { checkRole };