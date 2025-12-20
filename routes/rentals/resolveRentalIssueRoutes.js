import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// DELETE RENTAL ISSUE (Mark as Resolved)
// --------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const db = await connectDB();
  const issueId = parseInt(req.params.id);

  const {
    renterName,
    issueProvider,
    carInfo,
    rentalId,
    resolvedAt
  } = req.body;

  if (!issueId || isNaN(issueId) || issueId <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid issue ID. Must be a positive number."
    });
  }

  try {
    // DELETE FIRST — THIS IS THE SOURCE OF TRUTH
    const [result] = await db.query(
      "DELETE FROM rental_issues WHERE id = ?",
      [issueId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Rental issue not found or already resolved"
      });
    }

    // AUDIT LOG — MUST NOT AFFECT CLIENT RESPONSE
    try {
      const auditDescription = `
Rental issue resolved and removed from the system.

Renter: ${renterName}
Issue Provider: ${issueProvider}
Vehicle: ${carInfo}
Rental ID: ${rentalId}
Resolved At: ${resolvedAt || new Date().toISOString()}
      `.trim();

      await db.query(
        `INSERT INTO audit_logs (
          actor_id,
          action,
          description,
          entity_type,
          entity_id
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          req.session?.userId,
          "Resolve Rental Issue",
          auditDescription,
          "Rental Issue",
          issueId
        ]
      );
    } catch (auditErr) {
      console.error("⚠️ Audit log failed:", auditErr);
    }

    // CLIENT RESPONSE ALWAYS MATCHES REALITY
    return res.status(200).json({
      success: true,
      message: "Rental issue resolved successfully",
      data: {
        id: issueId,
        deleted: true
      }
    });

  } catch (err) {
    console.error("❌ Delete rental issue error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to resolve rental issue",
      details: err.message
    });
  }
});

export default router;
