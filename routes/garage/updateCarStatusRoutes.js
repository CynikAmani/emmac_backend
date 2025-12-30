import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const db = await connectDB();
  const { carId, status, oldStatus } = req.body;

  if (!carId || !status) {
    return res.status(400).json({
      error: "Car ID and status are required",
    });
  }

  try {
    // Update only the status field
    const [result] = await db.query(
      `UPDATE car_details 
       SET status = ?
       WHERE id = ?`,
      [status, carId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Car not found or no changes made",
      });
    }

    // AUDIT LOG
    const actorId = req.session.userId;
    const action = "Car Status Update";
    const description = `Updated Car Status from '${oldStatus}' to '${status}'`;
    const entityType = "Vehicle";
    const entityId = carId;

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, description, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?)`,
      [actorId, action, description, entityType, entityId]
    );

    res.status(200).json({
      message: "Car status updated successfully",
      carId,
      status,
    });
  } catch (err) {
    console.error("Error updating car status:", err);
    res.status(500).json({
      error: "Failed to update car status",
      details: err.message,
    });
  }
});

export default router;
