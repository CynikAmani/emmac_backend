/**
 * Middleware to check if a user is logged in (session exists)
 */
export const checkSession = (req, res, next) => {
  
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No active session'
    });
  }
  // Session exists, proceed
  next();
};