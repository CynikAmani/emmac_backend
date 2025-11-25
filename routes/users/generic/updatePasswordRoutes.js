import { connectDB } from '../../../config/db/connect.js';
import bcrypt from 'bcrypt';

const updatePassword = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new passwords are required' });
    }

    const db = await connectDB();

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = rows[0].password;

    const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const saltRounds = 12;
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query(
      'UPDATE users SET password = ?, default_password = false WHERE id = ?',
      [newHashedPassword, userId]
    );

    res.status(200).json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('❌ Error updating password:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};

export default updatePassword;
