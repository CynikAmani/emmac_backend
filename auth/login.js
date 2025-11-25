import express from 'express';
import { connectDB } from '../config/db/connect.js';
import bcrypt from 'bcrypt';

const router = express.Router();


router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const db = await connectDB();
    const [rows] = await db.query(
      `SELECT id, password, deactivated FROM users WHERE email = ?`,
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];

    if (user.deactivated === 1 || user.deactivated === true) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact admin.'
      });
    }

    const correct = await bcrypt.compare(password, user.password);
    if (!correct) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // --- STORE ONLY userId ---
    req.session.userId = user.id;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      userId: user.id
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/login/session  -> return only userId if logged in
router.get('/session', (req, res) => {
  if (req.session?.userId) {
    return res.json({ loggedIn: true, userId: req.session.userId });
  }
  return res.json({ loggedIn: false });
});

// POST /api/login/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'session_id');
    return res.json({ success: true, message: 'Logged out' });
  });
});

export default router;
