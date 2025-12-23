import { connectDB } from '../../../config/db/connect.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// --------------------------------------------------------
// Multer setup for /uploads
// --------------------------------------------------------
const UPLOAD_DIR = './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Generate random 16-byte filename + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex') + ext;

    // Enforce max filename length (e.g., 100 chars including extension)
    const maxLength = 100;
    const safeName = randomName.slice(0, maxLength - ext.length) + ext;

    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const isValid = allowedTypes.test(file.mimetype.toLowerCase());
    cb(isValid ? null : new Error('Invalid file type'), isValid);
  }
}).single('profile_image');

// --------------------------------------------------------
// API Endpoint
// --------------------------------------------------------
const updateProfileImage = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'User not logged in' });

  upload(req, res, async function (err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Failed to upload image' });
    }

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

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
        filename
      });
    } catch (dbErr) {
      console.error('DB error:', dbErr);
      res.status(500).json({ success: false, message: 'Server error updating profile image' });
    }
  });
};

export default updateProfileImage;
