// routes/auth/logout.js
import express from 'express';

const router = express.Router();

// POST /api/logout
router.post('/', (req, res) => {
  if (!req.session) {
    return res.status(400).json({ success: false, message: 'No active session' });
  }

  req.session.destroy(err => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }

    // Clear session cookie
    res.clearCookie('session_id');
    return res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
