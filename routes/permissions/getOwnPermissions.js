import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

// GET /api/getOwnPermissions
router.get('/', async (req, res) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const db = await connectDB();

  try {
    // Get user type
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userType = user[0].user_type || '';
    const normalizedUserType = userType.toLowerCase();

    // Check for admin or super user (strict matching)
    const isSuperUser = normalizedUserType === 'super_user';
    const isAdmin = normalizedUserType === 'admin';

    // Return admin privileges for admin or super user
    if (isAdmin || isSuperUser) {
      return res.json({
        userRole: normalizedUserType,
        permissions: ['All administrative operations allowed'],
        isAdmin: true
      });
    }

    // For Staff users, get their specific permissions
    const [permissions] = await db.query(
      `SELECT p.permission_name
       FROM staff_permissions sp
       JOIN permissions p ON sp.permission_id = p.id
       WHERE sp.user_id = ?`,
      [userId]
    );

    const permissionList = permissions.map(p => p.permission_name);

    res.json({
      userRole: 'staff',
      permissions: permissionList,
      isAdmin: false
    });

  } catch (err) {
    console.error('❌ Error fetching permissions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;