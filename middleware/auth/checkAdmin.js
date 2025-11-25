import { connectDB } from '../../config/db/connect.js';

/**
 * Middleware to check if user is admin or superadmin
 * Must run AFTER checkSession
 */
export const checkAdmin = async (req, res, next) => {
  try {
    const db = await connectDB();

    const [rows] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
    }

    const userType = rows[0].user_type.toLowerCase();
    console.log(userType);
    

    if (!userType.includes('admin') && !userType.includes('super')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Insufficient privileges' });
    }

    next();
  } catch (err) {
    console.error('❌ checkAdmin error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
