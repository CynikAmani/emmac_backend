import { connectDB } from '../../../config/db/connect.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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
 * Multer setup
 * =========================
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const isValid = allowed.test(file.mimetype.toLowerCase());
    cb(isValid ? null : new Error('Invalid file type'), isValid);
  }
}).single('profile_image');

/**
 * =========================
 * API Endpoint
 * =========================
 */
const updateProfileImage = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to upload image'
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      const db = await connectDB();
      const filename = req.file.filename;

      await db.query(
        'UPDATE users SET profile_image = ? WHERE id = ?',
        [filename, userId]
      );

      res.status(200).json({
        success: true,
        message: 'Profile image updated successfully',
        filename,
        url: `/images/${filename}`
      });
    } catch (dbErr) {
      console.error('DB error:', dbErr);
      res.status(500).json({
        success: false,
        message: 'Server error updating profile image'
      });
    }
  });
};

export default updateProfileImage;
