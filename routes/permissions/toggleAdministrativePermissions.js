// routes/manageAdministrativePermissions.js
import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, permissionId, action } = req.body; // action: 'assign' or 'remove'

  // Validate
  if (!userId || isNaN(userId) || !permissionId || isNaN(permissionId) || !action) {
    return res.status(400).json({
      success: false,
      message: "Valid userId, permissionId, and action are required"
    });
  }

  if (!['assign', 'remove'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be either 'assign' or 'remove'"
    });
  }

  try {
    const db = await connectDB();

    if (action === 'assign') {
      // Check if permission already exists to avoid duplicates
      const [existing] = await db.query(
        'SELECT * FROM staff_permissions WHERE user_id = ? AND permission_id = ?',
        [userId, permissionId]
      );

      if (existing.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Permission already assigned'
        });
      }

      // Assign new permission
      await db.query(
        'INSERT INTO staff_permissions (user_id, permission_id) VALUES (?, ?)',
        [userId, permissionId]
      );

      return res.status(200).json({
        success: true,
        message: 'Permission assigned successfully'
      });

    } else if (action === 'remove') {
      // Remove permission
      const [result] = await db.query(
        'DELETE FROM staff_permissions WHERE user_id = ? AND permission_id = ?',
        [userId, permissionId]
      );

      if (result.affectedRows === 0) {
        return res.status(200).json({
          success: true,
          message: 'Permission was not assigned'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Permission removed successfully'
      });
    }

  } catch (error) {
    console.error('❌ Error managing permission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to manage permission'
    });
  }
});

export default router;