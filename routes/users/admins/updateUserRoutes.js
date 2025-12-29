import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { connectDB } from '../../../config/db/connect.js';

/**
 * =========================
 * Uploads directory
 * =========================
 */
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve('uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * =========================
 * Multer configuration
 * =========================
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * =========================
 * API Handler
 * =========================
 */
export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  upload.single('profile_image')(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { first_name, last_name, email, user_type } = req.body;

      if (!first_name || !last_name || !email || !user_type) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const db = await connectDB();

      const [existingUsers] = await db.query(
        'SELECT id, profile_image FROM users WHERE id = ?',
        [userId]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [emailCheck] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (emailCheck.length > 0) {
        return res.status(409).json({ error: 'Email already taken by another user' });
      }

      const existingUser = existingUsers[0];
      let profileImageName = existingUser.profile_image;

      if (req.file) {
        profileImageName = req.file.filename;
      }

      await db.query(
        `UPDATE users
         SET first_name = ?, last_name = ?, email = ?, profile_image = ?, user_type = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [first_name, last_name, email, profileImageName, user_type, userId]
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: Number(userId),
          first_name,
          last_name,
          email,
          user_type,
          profile_image: profileImageName
        }
      });

    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });
}
