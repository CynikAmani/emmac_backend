import { connectDB } from '../../../config/db/connect.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.session.userId;
    

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = await connectDB();

    const [users] = await db.query(
      'SELECT default_password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      isDefaultPassword: Boolean(users[0].default_password)
    });

  } catch (error) {
    console.error('Error checking password status:', error);
    res.status(500).json({ error: 'Failed to check password status' });
  }
}
