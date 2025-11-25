// routes/api/toggleUserDeactivation.js
import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId } = req.body;

  // Validate input
  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: "Valid userId is required"
    });
  }

  try {
    const db = await connectDB();

    // Flip the boolean using NOT
    const [result] = await db.query(
      `UPDATE users 
       SET deactivated = NOT deactivated 
       WHERE id = ?`,
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Fetch new state
    const [row] = await db.query(
      `SELECT deactivated FROM users WHERE id = ?`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "User status toggled successfully",
      deactivated: row[0].deactivated
    });

  } catch (err) {
    console.error("❌ Error toggling user state:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle user state"
    });
  }
});

export default router;
