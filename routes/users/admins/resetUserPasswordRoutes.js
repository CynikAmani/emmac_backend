import { connectDB } from '../../../config/db/connect.js';
import bcrypt from 'bcrypt';

// Generate random friendly password
const generateFriendlyPassword = () => {
  const adjectives = ['Happy', 'Sunny', 'Brave', 'Calm', 'Gentle', 'Swift', 'Clever', 'Wise', 'Bright', 'Cool', 'Fresh'];
  const nouns = ['Tiger', 'Eagle', 'River', 'Mountain', 'Star', 'Ocean', 'Forest', 'Cloud', 'Moon', 'Rain', 'Sun'];
  const randomNum = Math.floor(100 + Math.random() * 900);
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${randomNum}`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = await connectDB();

    // Check if user exists and get email
    const [users] = await db.query(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Generate new password
    const newPassword = generateFriendlyPassword();
    
    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password = ?, default_password = TRUE WHERE id = ?',
      [hashedPassword, userId]
    );

    // Respond with just username and new password
    res.status(200).json({
      username: user.email,
      password: newPassword,
      note: 'User must change password on next login.'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}