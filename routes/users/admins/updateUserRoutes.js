import multer from 'multer';
import path from 'path';
import { connectDB } from '../../../config/db/connect.js';

// Configure multer for file uploads (same as createUser)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
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
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Use multer to handle form data with file upload
  upload.single('profile_image')(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { first_name, last_name, email, user_type } = req.body;
      
      // Validate required fields
      if (!first_name || !last_name || !email || !user_type) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const db = await connectDB();

      // Check if user exists
      const [existingUsers] = await db.query(
        'SELECT id, profile_image FROM users WHERE id = ?',
        [userId]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if email is already taken by another user
      const [emailCheck] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (emailCheck.length > 0) {
        return res.status(409).json({ error: 'Email already taken by another user' });
      }

      const existingUser = existingUsers[0];
      let profileImageName = existingUser.profile_image;

      // Handle new profile image upload
      if (req.file) {
        profileImageName = req.file.filename;
      }

      // Update user in database
      await db.query(
        `UPDATE users 
         SET first_name = ?, last_name = ?, email = ?, profile_image = ?, user_type = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [first_name, last_name, email, profileImageName, user_type, userId]
      );

      // Return updated user data
      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: parseInt(userId),
          first_name,
          last_name,
          email,
          user_type,
          profile_image: profileImageName,
        }
      });

    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });
}