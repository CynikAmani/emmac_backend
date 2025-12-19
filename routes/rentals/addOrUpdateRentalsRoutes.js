import express from "express";
import multer from "multer";
import path from "path";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// Multer Setup
// --------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Updated upload fields - removed witness_id_image
const uploadFields = upload.fields([
  { name: "renter_signature", maxCount: 1 },
  { name: "renter_id_image", maxCount: 1 },
  { name: "license_image", maxCount: 1 }
  // Removed witness_id_image
]);

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------
const parseBool = (v) => (v === "true" || v === true ? true : false);

const parseDateTime = (v) => (v ? new Date(v) : null);

const getFileName = (files, key) =>
  files[key] ? files[key][0].filename : null;

const parseSignature = (raw) => {
  if (!raw) return null;
  try {
    return Buffer.from(raw.replace(/^data:image\/\w+;base64,/, ""), "base64");
  } catch {
    return null;
  }
};

// --------------------------------------------------------
// INSERT builder - MATCHING YOUR TABLE STRUCTURE
// --------------------------------------------------------
const buildInsertData = (body, files, handlerId) => {
  return {
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
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      handlerId,
      Number(body.car_id),
      body.renter_full_name,
      body.renter_phone,
      parseSignature(body.renter_signature),
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
      body.fuel_gauge, // Changed from fuel_gauge_id to fuel_gauge (string)
      "active"
    ]
  };
};

// --------------------------------------------------------
// UPDATE builder - MATCHING YOUR TABLE STRUCTURE
// --------------------------------------------------------
const buildUpdateData = (body, files, handlerId) => {
  return {
    sql: `
      UPDATE car_rentals SET
        handler_id = ?,
        car_id = ?,
        renter_full_name = ?,
        renter_phone = ?,
        renter_email = ?,
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
      body.renter_email,
      parseSignature(body.renter_signature),
      getFileName(files, "renter_id_image") ?? body.existing_renter_id_image,
      getFileName(files, "license_image") ?? body.existing_license_image,
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
      body.fuel_gauge, // Changed from fuel_gauge_id to fuel_gauge (string)
      "active",
      Number(body.id)
    ]
  };
};

// --------------------------------------------------------
// MAIN ROUTE
// --------------------------------------------------------
router.post("/", uploadFields, async (req, res) => {
  const db = await connectDB();
  const body = req.body;
  const files = req.files || {};
  const editMode = body.editMode === "true" || body.editMode === true;

  const handlerId = req.session?.userId;

  if (!handlerId) {
    return res.status(401).json({
      error: "Unauthorized",
      details: "No active session. Handler ID missing."
    });
  }

  try {
    if (editMode) {
      const [existing] = await db.query(
        "SELECT id FROM car_rentals WHERE id = ?",
        [body.id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          error: "Rental not found",
          details: `Rental ID ${body.id} does not exist`
        });
      }

      const { sql, values } = buildUpdateData(body, files, handlerId);
      const [result] = await db.query(sql, values);

      return res.status(200).json({
        message: "Rental updated successfully",
        rentalId: body.id,
        affected: result.affectedRows
      });
    }

    // INSERT
    const { sql, values } = buildInsertData(body, files, handlerId);
    const [result] = await db.query(sql, values);

    // Update car status to Rented
    await db.query("UPDATE car_details SET status = 'Rented' WHERE id = ?", [Number(body.car_id)]);

    return res.status(201).json({
      message: "Rental created successfully",
      rentalId: result.insertId
    });

  } catch (err) {
    console.error("❌ Rental insert/update error:", err);
    res.status(500).json({
      error: "Failed to save rental",
      details: err.message
    });
  }
});

export default router;