import express from "express";
import multer from "multer";
import path from "path";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// Multer Setup (FILES → DISK ONLY) - REMOVED SIGNATURE
// --------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({ storage });
const uploadFields = upload.fields([
  { name: "renter_id_image", maxCount: 1 },
  { name: "license_image", maxCount: 1 }
]);

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------
const parseBool = (v) => v === "true" || v === true;
const parseDateTime = (v) => (v ? new Date(v) : null);
const getFileName = (files, key) => files?.[key]?.[0]?.filename || null;

// --------------------------------------------------------
// INSERT builder
// --------------------------------------------------------
const buildInsertData = (body, files, handlerId) => ({
  sql: `
    INSERT INTO car_rentals (
      handler_id,
      car_id,
      renter_full_name,
      renter_phone,
      renter_signature,
      renter_id_image,
      license_image,
      renter_residence,
      renter_occupation_type,
      occupation_description,
      rental_reason,
      pick_up_location,
      destination,
      collection_datetime,
      expected_return_datetime,
      actual_return_datetime,
      abs_warning,
      engine_check_warning,
      temperature_warning,
      battery_warning,
      fuel_gauge,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  values: [
    handlerId,
    Number(body.car_id),
    body.renter_full_name,
    body.renter_phone,
    body.renter_signature || null, // Changed: Get from body, not files
    getFileName(files, "renter_id_image"),
    getFileName(files, "license_image"),
    body.renter_residence,
    body.renter_occupation_type || null,
    body.occupation_description,
    body.rental_reason,
    body.pick_up_location,
    body.destination,
    parseDateTime(body.collection_datetime),
    parseDateTime(body.expected_return_datetime),
    parseDateTime(body.actual_return_datetime),
    parseBool(body.abs_warning),
    parseBool(body.engine_check_warning),
    parseBool(body.temperature_warning),
    parseBool(body.battery_warning),
    body.fuel_gauge,
    "active"
  ]
});

// --------------------------------------------------------
// UPDATE builder
// --------------------------------------------------------
const buildUpdateData = (body, files, handlerId) => ({
  sql: `
    UPDATE car_rentals SET
      handler_id = ?,
      car_id = ?,
      renter_full_name = ?,
      renter_phone = ?,
      renter_signature = ?,
      renter_id_image = ?,
      license_image = ?,
      renter_residence = ?,
      renter_occupation_type = ?,
      occupation_description = ?,
      rental_reason = ?,
      pick_up_location = ?,
      destination = ?,
      collection_datetime = ?,
      expected_return_datetime = ?,
      actual_return_datetime = ?,
      abs_warning = ?,
      engine_check_warning = ?,
      temperature_warning = ?,
      battery_warning = ?,
      fuel_gauge = ?,
      status = ?
    WHERE id = ?
  `,
  values: [
    handlerId,
    Number(body.car_id),
    body.renter_full_name,
    body.renter_phone,
    body.renter_signature || null, // Changed: Get from body, not files
    getFileName(files, "renter_id_image"),
    getFileName(files, "license_image"),
    body.renter_residence,
    body.renter_occupation_type || null,
    body.occupation_description,
    body.rental_reason,
    body.pick_up_location,
    body.destination,
    parseDateTime(body.collection_datetime),
    parseDateTime(body.expected_return_datetime),
    parseDateTime(body.actual_return_datetime),
    parseBool(body.abs_warning),
    parseBool(body.engine_check_warning),
    parseBool(body.temperature_warning),
    parseBool(body.battery_warning),
    body.fuel_gauge,
    "active",
    Number(body.id)
  ]
});

// --------------------------------------------------------
// MAIN ROUTE
// --------------------------------------------------------
router.post("/", uploadFields, async (req, res) => {
  const db = await connectDB();
  const { body, files } = req;
  const editMode = body.editMode === "true";
  const handlerId = req.session?.userId;

  if (!handlerId) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (editMode) {
      // Fetch existing rental for audit logging
      const [existingRows] = await db.query(
        "SELECT renter_full_name FROM car_rentals WHERE id = ?",
        [Number(body.id)]
      );
      if (!existingRows.length) {
        return res.status(404).json({ error: "Rental not found" });
      }

      const { sql, values } = buildUpdateData(body, files, handlerId);
      const [result] = await db.query(sql, values);

      // AUDIT LOG - Rental Update Operation (WHO updated the rental)
      try {
        const existingRental = existingRows[0];
        const auditDescription = `Rental updated. Renter: ${existingRental.renter_full_name}`;
        
        await db.query(
          `INSERT INTO audit_logs (
            actor_id,
            action,
            description,
            entity_type,
            entity_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            handlerId,
            "Update Rental",
            auditDescription,
            "Rental",
            Number(body.id)
          ]
        );
      } catch (auditErr) {
        console.error("⚠️ Audit log failed:", auditErr);
        // Continue - audit failure shouldn't affect client response
      }

      return res.json({ 
        message: "Rental updated successfully",
        rentalId: body.id,
        affected: result.affectedRows 
      });
    }

    // Insert new rental (NO AUDIT LOG FOR CREATION)
    const { sql, values } = buildInsertData(body, files, handlerId);
    const [result] = await db.query(sql, values);

    // Update car status
    await db.query(
      "UPDATE car_details SET status = 'Rented' WHERE id = ?",
      [Number(body.car_id)]
    );

    return res.status(201).json({
      message: "Rental created successfully",
      rentalId: result.insertId
    });

  } catch (err) {
    console.error("❌ Rental error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;