import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

// ✅ GET all permissions
router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    const [rows] = await db.query('SELECT * FROM permissions ORDER BY id ASC');
    return res.status(200).json({
      success: true,
      permissions: rows
    });
  } catch (err) {
    console.error('❌ Error fetching permissions:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions'
    });
  }
});

export default router;
