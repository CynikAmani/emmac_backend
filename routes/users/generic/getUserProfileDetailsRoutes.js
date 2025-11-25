import { connectDB } from "../../../config/db/connect.js";
import { checkSession } from "../../../middleware/auth/checkSession.js";

const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not logged in"
      });
    }

    const db = await connectDB();

    const [rows] = await db.query(
      `
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        profile_image, 
        user_type, 
        default_password, 
        deactivated,
        created_at, 
        updated_at
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: rows[0]
    });

  } catch (error) {
    console.error("❌ Error fetching user profile:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching user profile"
    });
  }
};

// Export as middleware chain
export default [
  checkSession,
  getUserProfile
];
