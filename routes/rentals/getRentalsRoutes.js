import express from "express";
import moment from "moment";
import { connectDB } from "../../config/db/connect.js";

const router = express.Router();

// --------------------------------------------------------
// GET Active or Overdue Rentals
// --------------------------------------------------------
router.get("/", async (req, res) => {
  const { filter = "active" } = req.query; // 'active' or 'overdue'

  if (!["active", "overdue"].includes(filter)) {
    return res.status(400).json({
      error: "Invalid filter",
      details: "Filter must be either 'active' or 'overdue'"
    });
  }

  const db = await connectDB();

  try {
    // Base query with car details join
    let baseQuery = `
      SELECT 
        cr.id,
        cr.renter_full_name,
        cr.renter_phone,
        cr.renter_email,
        cr.collection_datetime,
        cr.expected_return_datetime,
        cr.actual_return_datetime,
        cr.pick_up_location,
        cr.destination,
        cr.abs_warning,
        cr.engine_check_warning,
        cr.temperature_warning,
        cr.battery_warning,
        cr.status AS rental_status,
        cd.id AS car_id,
        cd.registration_number,
        cd.make,
        cd.model
      FROM car_rentals cr
      INNER JOIN car_details cd ON cr.car_id = cd.id
    `;

    // Filter based on rental_status
    if (filter === "active") {
      baseQuery += ` WHERE cr.status = 'active' `;
    } else if (filter === "overdue") {
      baseQuery += ` WHERE cr.status = 'overdue' `;
    }

    baseQuery += ` ORDER BY cr.expected_return_datetime ASC`;

    const [rentals] = await db.query(baseQuery);

    // Process each rental with moment.js calculations
    const processedRentals = rentals.map(rental => {
      const now = moment();
      const expectedReturn = moment(rental.expected_return_datetime);
      const isOverdue = now.isAfter(expectedReturn);

      const durationField = isOverdue
        ? { overdue_duration: `${Math.floor(moment.duration(now.diff(expectedReturn)).asDays())}d ${moment.duration(now.diff(expectedReturn)).hours()}h` }
        : { remaining_duration: `${Math.floor(moment.duration(expectedReturn.diff(now)).asDays())}d ${moment.duration(expectedReturn.diff(now)).hours()}h` };

      return {
        id: rental.id,
        renter_full_name: rental.renter_full_name,
        renter_phone: rental.renter_phone,
        renter_email: rental.renter_email,
        car_name: `${rental.make} ${rental.model} (${rental.registration_number})`,
        car_id: rental.car_id,
        collection_datetime: rental.collection_datetime,
        expected_return_datetime: rental.expected_return_datetime,
        actual_return_datetime: rental.actual_return_datetime,
        pick_up_location: rental.pick_up_location,
        destination: rental.destination,
        rental_status: rental.rental_status,
        warnings: {
          abs: rental.abs_warning,
          engine: rental.engine_check_warning,
          temperature: rental.temperature_warning,
          battery: rental.battery_warning
        },
        ...durationField
      };
    });

    res.status(200).json(processedRentals);

  } catch (err) {
    console.error("❌ Error fetching rentals:", err);
    res.status(500).json({
      error: "Failed to fetch rentals",
      details: err.message
    });
  }
});

export default router;