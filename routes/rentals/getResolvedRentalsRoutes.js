import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// GET ALL RESOLVED RENTALS (history list)
// --------------------------------------------------------
router.get("/", async (req, res) => {
  const db = await connectDB();
  const handlerId = req.session?.userId;

  if (!handlerId) {
    return res.status(401).json({
      error: "Unauthorized",
      details: "No active session. Handler ID missing."
    });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        cr.id AS rental_id,
        cr.car_id,
        cd.registration_number,
        cd.make,
        cd.model,
        cd.color,

        cr.renter_full_name,
        cr.rental_reason,
        cr.collection_datetime,
        cr.expected_return_datetime,
        cr.actual_return_datetime,
        cr.status,

        u.id AS handler_id,
        u.first_name,
        u.last_name

      FROM car_rentals cr
      INNER JOIN car_details cd ON cr.car_id = cd.id
      INNER JOIN users u ON cr.handler_id = u.id
      WHERE cr.status = 'resolved'
      ORDER BY cr.actual_return_datetime DESC
      `
    );

    const formatted = rows.map((r) => ({
      id: r.rental_id,
      car: {
        id: r.car_id,
        registration_number: r.registration_number,
        make: r.make,
        model: r.model,
        color: r.color
      },
      renter: {
        full_name: r.renter_full_name
      },
      rental: {
        reason: r.rental_reason,
        collection_datetime: r.collection_datetime,
        expected_return_datetime: r.expected_return_datetime,
        actual_return_datetime: r.actual_return_datetime,
        status: r.status
      },
      handled_by: {
        id: r.handler_id,
        name: `${r.first_name} ${r.last_name}`
      }
    }));

    return res.status(200).json({
      resolved_rentals: formatted,
      count: formatted.length
    });

  } catch (err) {
    console.error("❌ Fetch resolved rentals error:", err);
    return res.status(500).json({
      error: "Failed to fetch resolved rentals",
      details: err.message
    });
  }
});

export default router;
