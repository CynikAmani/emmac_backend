import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// GET RENTAL ISSUES
// --------------------------------------------------------
router.get("/", async (req, res) => {
  const db = await connectDB();

  try {
    const [issues] = await db.query(`
      SELECT 
        ri.id,
        ri.description,
        ri.created_at as issue_date,
        ri.provider_id,
        CONCAT(u.first_name, ' ', u.last_name) as provider_name,
        ri.rental_id,
        cr.renter_full_name,
        cr.renter_phone,
        CONCAT(cd.make, ' - ', cd.model, ' (', cd.registration_number, ')') as car_info
      FROM rental_issues ri
      LEFT JOIN users u ON ri.provider_id = u.id
      LEFT JOIN car_rentals cr ON ri.rental_id = cr.id
      LEFT JOIN car_details cd ON cr.car_id = cd.id
      ORDER BY ri.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: issues
    });

  } catch (err) {
    console.error("❌ Get rental issues error:", err);
    return res.status(500).json({
      error: "Failed to get rental issues",
      details: err.message
    });
  }
});

export default router;