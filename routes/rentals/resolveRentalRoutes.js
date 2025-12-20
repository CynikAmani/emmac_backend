import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------
async function getCarById(db, carId) {
  const [rows] = await db.query(
    "SELECT id, mileage, next_service_mileage FROM car_details WHERE id = ?",
    [carId]
  );
  return rows[0] || null;
}

function validateMileage(currentMileage, existingMileage) {
  if (currentMileage <= existingMileage) {
    return {
      valid: false,
      message: `Mileage must be greater than the current recorded value (${existingMileage}).`
    };
  }
  return { valid: true };
}

async function updateCarMileage(db, carId, currentMileage, diff) {
  const nextServiceUpdate = `
    UPDATE car_details
    SET mileage = ?, next_service_mileage = next_service_mileage + ?
    WHERE id = ?
  `;
  const [result] = await db.query(nextServiceUpdate, [
    currentMileage,
    diff,
    carId
  ]);
  return result.affectedRows;
}

async function logAudit(db, actorId, action, description, entityType, entityId) {
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, description, entity_type, entity_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [actorId, action, description, entityType, entityId]
  );
}

async function createRentalIssue(db, providerId, description, rentalId) {
  await db.query(
    `INSERT INTO rental_issues (provider_id, description, rental_id) 
     VALUES (?, ?, ?)`,
    [providerId, description, rentalId]
  );
}

// --------------------------------------------------------
// RESOLVE RENTAL
// --------------------------------------------------------
router.post("/:id", async (req, res) => {
  const db = await connectDB();
  const rentalId = Number(req.params.id);
  const handlerId = req.session?.userId;

  const { currentMileage, carId, hasIssues, issueDescription } = req.body;
  

  if (!handlerId) {
    return res.status(401).json({
      error: "Unauthorized",
      details: "No active session. Handler ID missing."
    });
  }

  if (!currentMileage || !carId) {
    return res.status(400).json({
      error: "Invalid request",
      details: "currentMileage and carId are required."
    });
  }

  try {
    // Ensure rental exists
    const [existing] = await db.query(
      "SELECT id FROM car_rentals WHERE id = ?",
      [rentalId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: "Rental not found",
        details: `Rental ID ${rentalId} does not exist`
      });
    }

    // --------------------------------------------------------
    // Fetch car details and validate mileage
    // --------------------------------------------------------
    const car = await getCarById(db, carId);

    if (!car) {
      return res.status(404).json({
        error: "Car not found",
        details: `Car ID ${carId} does not exist`
      });
    }

    const mileageValidation = validateMileage(currentMileage, car.mileage);
    if (!mileageValidation.valid) {
      return res.status(400).json({
        error: "Invalid mileage",
        details: mileageValidation.message
      });
    }

    // Compute mileage difference
    const diff = Number(currentMileage) - Number(car.mileage);

    // --------------------------------------------------------
    // Update car mileage and next service mileage
    // --------------------------------------------------------
    await updateCarMileage(db, carId, currentMileage, diff);

    // --------------------------------------------------------
    // Resolve rental
    // --------------------------------------------------------
    const [rentalUpdate] = await db.query(
      `
        UPDATE car_rentals
        SET 
          status = 'resolved',
          actual_return_datetime = NOW(),
          handler_id = ?
        WHERE id = ?
      `,
      [handlerId, rentalId]
    );

    // Update car status to Available
    await db.query(
      "UPDATE car_details SET status = 'Available' WHERE id = ?",
      [carId]
    );

    // --------------------------------------------------------
    // Log audit entry
    // --------------------------------------------------------
    await logAudit(
      db,
      handlerId,
      'RESOLVE_RENTAL',
      `Rental #${rentalId} resolved with mileage ${currentMileage}`,
      'RENTAL',
      rentalId
    );

    // --------------------------------------------------------
    // Create rental issue if hasIssues is true
    // --------------------------------------------------------
    if (hasIssues && issueDescription) {
      await createRentalIssue(
        db,
        handlerId,
        issueDescription,
        rentalId
      );

      // Log audit for issue creation
      await logAudit(
        db,
        handlerId,
        'CREATE_RENTAL_ISSUE',
        `Issue reported for rental #${rentalId}`,
        'RENTAL_ISSUE',
        rentalId
      );
    }

    return res.status(200).json({
      message: "Rental resolved successfully",
      rentalId,
      mileageUpdated: {
        previousMileage: car.mileage,
        newMileage: currentMileage,
        diff
      },
      hasIssues: hasIssues || false,
      issueLogged: hasIssues && issueDescription ? true : false,
      affected: rentalUpdate.affectedRows
    });

  } catch (err) {
    console.error("❌ Rental resolve error:", err);
    return res.status(500).json({
      error: "Failed to resolve rental",
      details: err.message
    });
  }
});

export default router;