import express from "express";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing rental ID" });
  }

  const db = await connectDB();

  try {
    const query = `
      SELECT 
        cr.*,
        CONCAT(cd.make, ' ', cd.model, ' (', cd.registration_number, ')') AS car_name,
        cd.color,
        cd.fuel_type,
        cd.mileage,
        cd.engine_capacity,
        cd.last_service_date,
        cd.insurance_cof_expiry_date,
        cd.next_service_mileage,
        cd.status AS car_status,
        cd.has_jack,
        cd.has_wheel_spanner,
        cd.has_fire_extinguisher,
        cd.has_triangles,
        cd.has_spare_tyre,
        cd.air_conditioner_working,
        cd.radio_working,
        cd.lights_working,
        cd.windows_working,
        cd.doors_working,
        CONCAT(u.first_name, ' ', u.last_name) AS handler_name,
        u.profile_image AS handler_profile_image
      FROM car_rentals cr
      INNER JOIN car_details cd ON cr.car_id = cd.id
      INNER JOIN users u ON cr.handler_id = u.id
      WHERE cr.id = ?
    `;

    const [rentals] = await db.query(query, [id]);

    if (rentals.length === 0) {
      return res.status(404).json({ error: "Rental not found" });
    }

    const rental = rentals[0];

    // Convert BLOB signature to Base64
    const renterSignatureBase64 = rental.renter_signature
      ? `data:image/png;base64,${Buffer.from(rental.renter_signature).toString('base64')}`
      : null;

    res.status(200).json({
      id: rental.id,

      car_info: {
        car_name: rental.car_name,
        color: rental.color,
        fuel_type: rental.fuel_type,
        mileage: rental.mileage,
        engine_capacity: rental.engine_capacity,
        last_service_date: rental.last_service_date,
        insurance_cof_expiry_date: rental.insurance_cof_expiry_date,
        next_service_mileage: rental.next_service_mileage,
        status: rental.car_status
      },

      rental_details: {
        renter_full_name: rental.renter_full_name,
        renter_phone: rental.renter_phone,
        renter_email: rental.renter_email,
        rental_reason: rental.rental_reason,
        pick_up_location: rental.pick_up_location,
        destination: rental.destination,
        collection_datetime: rental.collection_datetime,
        expected_return_datetime: rental.expected_return_datetime,
        actual_return_datetime: rental.actual_return_datetime,
        status: rental.status,
        handler_name: rental.handler_name,
        handler_profile_image: rental.handler_profile_image
      },

      files: {
        renter_signature: renterSignatureBase64,
        renter_id_image: rental.renter_id_image,
        license_image: rental.license_image,
        witness_id_image: rental.witness_id_image
      },

      equipment_checklist: {
        has_jack: rental.has_jack,
        has_wheel_spanner: rental.has_wheel_spanner,
        has_fire_extinguisher: rental.has_fire_extinguisher,
        has_triangles: rental.has_triangles,
        has_spare_tyre: rental.has_spare_tyre
      },

      condition_checklist: {
        air_conditioner_working: rental.air_conditioner_working,
        radio_working: rental.radio_working,
        lights_working: rental.lights_working,
        windows_working: rental.windows_working,
        doors_working: rental.doors_working
      },

      warnings: {
        abs: rental.abs_warning,
        engine: rental.engine_check_warning,
        temperature: rental.temperature_warning,
        battery: rental.battery_warning
      },

      additional_info: {
        fuel_gauge: rental.fuel_gauge,
        witness_name: rental.witness_name,
        created_at: rental.created_at,
        updated_at: rental.updated_at
      }
    });

  } catch (err) {
    console.error("❌ Error fetching rental:", err);
    res.status(500).json({
      error: "Failed to fetch rental",
      details: err.message
    });
  }
});

export default router;
