import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId } = req.body;

  // Validate
  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: "Valid userId is required"
    });
  }

  try {
    const db = await connectDB();

    const [rows] = await db.query(
      'SELECT permission_id FROM staff_permissions WHERE user_id = ? ORDER BY permission_id ASC',
      [userId]
    );

    // Extract array of IDs
    const assignedPermissions = rows.map(r => r.permission_id);

    return res.status(200).json({
      success: true,
      assignedPermissions
    });

  } catch (error) {
    console.error('❌ Error fetching user permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user permissions'
    });
  }
});

export default router;
