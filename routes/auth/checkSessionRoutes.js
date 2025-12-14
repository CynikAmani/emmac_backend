import express from 'express';
import { checkSession } from '../../middleware/auth/checkSession.js';

const router = express.Router();

// GET /api/session
router.get('/', checkSession, (req, res) => {
  // Session is valid, return user info if you want
  res.json({
    success: true,
    userId: req.session.userId,
    userName: req.session.userName || null
  });
});

export default router;
