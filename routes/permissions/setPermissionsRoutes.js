import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { permission_name, description, editMode, id } = req.body;

  if (!permission_name || permission_name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: "Permission name is required"
    });
  }

  try {
    const db = await connectDB();

    if (editMode && id) {
      // Update existing permission
      const updateQuery = `
        UPDATE permissions
        SET permission_name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await db.query(updateQuery, [permission_name, description || null, id]);

      return res.status(200).json({
        success: true,
        message: "Permission updated successfully"
      });

    } else {
      // Insert new permission
      const insertQuery = `
        INSERT INTO permissions (permission_name, description)
        VALUES (?, ?)
      `;
      await db.query(insertQuery, [permission_name, description || null]);

      return res.status(201).json({
        success: true,
        message: "Permission added successfully"
      });
    }

  } catch (err) {
    console.error("❌ Error saving permission:", err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: "Permission already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;
