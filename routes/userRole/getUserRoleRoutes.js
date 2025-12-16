// routes/userRole.js
import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.get('', async (req, res) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get a connection from the pool
    const connection = await connectDB();

    const [rows] = await connection.execute(
      'SELECT user_type FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ role: rows[0].user_type });
  } catch (err) {
    console.error('Get user role error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;