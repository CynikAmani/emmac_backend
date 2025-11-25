import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

// ✅ GET all system users except Super_user
router.get('/', async (req, res) => {
  try {
    const db = await connectDB();

    const [rows] = await db.query(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        profile_image, 
        user_type, 
        default_password, 
        deactivated,
        created_at, 
        updated_at
      FROM users
      WHERE user_type != 'Super_user'
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      success: true,
      total_users: rows.length,
      users: rows
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

export default router;
