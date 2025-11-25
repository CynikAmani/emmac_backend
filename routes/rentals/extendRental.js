import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// EXTEND RENTAL
// --------------------------------------------------------
router.post("/:id", async (req, res) => {
  const db = await connectDB();
  const rentalId = Number(req.params.id);
  const handlerId = req.session?.userId;
  const { new_return_datetime } = req.body;

  if (!handlerId) {
    return res.status(401).json({
      error: "Unauthorized",
      details: "No active session. Handler ID missing."
    });
  }

  if (!new_return_datetime) {
    return res.status(400).json({
      error: "Bad Request",
      details: "New return datetime is required"
    });
  }

  try {
    // Check if rental exists and is active
    const [existing] = await db.query(
      `SELECT id, collection_datetime, expected_return_datetime 
       FROM car_rentals 
       WHERE id = ? AND status = 'active'`,
      [rentalId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: "Rental not found",
        details: `Rental ID ${rentalId} does not exist or is not active`
      });
    }

    const rental = existing[0];
    const newReturnDate = new Date(new_return_datetime);
    const collectionDate = new Date(rental.collection_datetime);
    const currentExpectedReturn = new Date(rental.expected_return_datetime);

    // Validate new return date
    if (newReturnDate <= collectionDate) {
      return res.status(400).json({
        error: "Invalid date",
        details: "New return date must be after collection date"
      });
    }

    if (newReturnDate <= currentExpectedReturn) {
      return res.status(400).json({
        error: "Invalid date",
        details: "New return date must be after current expected return date"
      });
    }

    // Extend rental - FIXED: Use updated_at instead of last_updated
    const [result] = await db.query(
      `
        UPDATE car_rentals
        SET 
          expected_return_datetime = ?,
          handler_id = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [newReturnDate, handlerId, rentalId]
    );

    return res.status(200).json({
      message: "Rental extended successfully",
      rentalId,
      new_return_datetime: newReturnDate,
      affected: result.affectedRows
    });

  } catch (err) {
    console.error("❌ Rental extension error:", err);
    return res.status(500).json({
      error: "Failed to extend rental",
      details: err.message
    });
  }
});

export default router;