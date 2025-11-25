// routes/api/getUserById.js
import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

// ✅ GET single user by ID (query or param both supported)
router.get('/:id', async (req, res) => {
  const id = req.params.id || req.query.id;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing user ID',
    });
  }

  try {
    const db = await connectDB();

    const [rows] = await db.query(
      `
      SELECT 
        first_name, 
        last_name, 
        email, 
        profile_image, 
        user_type,
        deactivated
      FROM users
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user',
    });
  }
});

export default router;
