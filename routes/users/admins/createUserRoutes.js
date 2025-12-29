import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { connectDB } from '../../../config/db/connect.js';
import bcrypt from 'bcrypt';

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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * =========================
 * Password generator
 * =========================
 */
const generateFriendlyPassword = () => {
  const adjectives = ['Happy', 'Sunny', 'Brave', 'Calm', 'Gentle', 'Swift', 'Clever', 'Wise', 'Bright', 'Cool', 'Fresh'];
  const nouns = ['Tiger', 'Eagle', 'River', 'Mountain', 'Star', 'Ocean', 'Forest', 'Cloud', 'Moon', 'Rain', 'Sun'];
  const randomNum = Math.floor(100 + Math.random() * 900);

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective}${noun}${randomNum}`;
};

/**
 * =========================
 * API Handler
 * =========================
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const plainPassword = generateFriendlyPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      const profileImageName = req.file ? req.file.filename : null;

      const [result] = await db.query(
        `INSERT INTO users 
         (first_name, last_name, email, profile_image, user_type, password, default_password)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email, profileImageName, user_type, hashedPassword, true]
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: result.insertId,
          first_name,
          last_name,
          email,
          user_type,
          profile_image: profileImageName
        },
        credentials: {
          username: email,
          password: plainPassword,
          note: 'Please share these credentials securely'
        }
      });

    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
}
