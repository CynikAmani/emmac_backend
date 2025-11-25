import multer from 'multer';
import path from 'path';
import { connectDB } from '../../../config/db/connect.js';
import bcrypt from 'bcrypt';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
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
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Generate random friendly password
const generateFriendlyPassword = () => {
  const adjectives = ['Happy', 'Sunny', 'Brave', 'Calm', 'Gentle', 'Swift', 'Clever', 'Wise', 'Bright', 'Cool', 'Fresh'];
  const nouns = ['Tiger', 'Eagle', 'River', 'Mountain', 'Star', 'Ocean', 'Forest', 'Cloud', 'Moon', 'Rain', 'Sun'];
  const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit number
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${randomNum}`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

      // Check if user already exists
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Generate random password
      const plainPassword = generateFriendlyPassword();
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

      // Handle profile image
      let profileImageName = null;
      if (req.file) {
        profileImageName = req.file.filename;
      }

      // Insert user into database
      const [result] = await db.query(
        `INSERT INTO users (first_name, last_name, email, profile_image, user_type, password, default_password) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email, profileImageName, user_type, hashedPassword, true]
      );

      // Return success response with generated credentials
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: result.insertId,
          first_name,
          last_name,
          email,
          user_type,
          profile_image: profileImageName,
        },
        credentials: {
          username: email,
          password: plainPassword, // Return plain password only once
          note: 'Please share these credentials with the user securely'
        }
      });

    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
}