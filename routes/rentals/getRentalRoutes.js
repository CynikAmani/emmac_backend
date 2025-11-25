import express from "express";
import { connectDB } from "../../config/db/connect.js";
import path from "path";
import fs from "fs";

const router = express.Router();

// Convert BLOB signature → base64 string
const encodeSignature = (buffer) => {
  if (!buffer) return null;
  return `data:image/png;base64,${buffer.toString("base64")}`;
};

// Build full URL for stored images
const buildImageURL = (fileName) => {
  if (!fileName) return null;
  return `/uploads/${fileName}`;
};

router.get("/", async (req, res) => {
  const rentalId = req.query.id;

  if (!rentalId) {
    return res.status(400).json({
      error: "Rental ID is required"
    });
  }

  try {
    const db = await connectDB();

    const [rows] = await db.query(
      `SELECT 
        id, handler_id, car_id,
        renter_full_name, renter_phone, renter_email,
        renter_signature, renter_id_image, license_image,
        witness_name, witness_id_image, rental_reason,
        pick_up_location, destination,
        collection_datetime, expected_return_datetime, actual_return_datetime,
        status,
        abs_warning, engine_check_warning, temperature_warning, battery_warning,
        fuel_gauge,
        created_at, updated_at
      FROM car_rentals
      WHERE id = ?
      LIMIT 1`,
      [rentalId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Rental not found",
        details: `Rental with ID ${rentalId} does not exist`
      });
    }

    const row = rows[0];

    // Prepare final response object
    const rental = {
      ...row,
      renter_signature: encodeSignature(row.renter_signature),
      renter_id_image: buildImageURL(row.renter_id_image),
      license_image: buildImageURL(row.license_image),
      witness_id_image: buildImageURL(row.witness_id_image),
      collection_datetime: row.collection_datetime,
      expected_return_datetime: row.expected_return_datetime,
      actual_return_datetime: row.actual_return_datetime
    };

    return res.status(200).json({
      message: "Rental fetched successfully",
      rental
    });

  } catch (err) {
    console.error("❌ Error fetching rental:", err);
    return res.status(500).json({
      error: "Failed to fetch rental details",
      details: err.message
    });
  }
});

export default router;
