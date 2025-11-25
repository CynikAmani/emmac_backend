// routes/garage/add-cars/addCarRoutes.js
import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

// Utility to clean date to YYYY-MM-DD
const cleanDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
};

// POST /api/addCar - Handles both creation and updates
router.post('/', async (req, res) => {
  const db = await connectDB();
  const data = req.body;
  const isEditMode = data.editMode === true;
  const registrationNumber = data.registration_number;

  try {
    // Check if car exists (for edit mode validation)
    if (isEditMode) {
      const [existingCar] = await db.query(
        'SELECT registration_number FROM car_details WHERE registration_number = ?',
        [registrationNumber]
      );

      if (existingCar.length === 0) {
        return res.status(404).json({ 
          error: 'Car not found', 
          details: `Car with registration number ${registrationNumber} does not exist` 
        });
      }
    }

    const values = [
      data.make,
      data.model,
      data.color || null,
      data.fuel_type || null,
      data.mileage || null,
      data.engine_capacity || null,
      cleanDate(data.last_service_date),
      cleanDate(data.insurance_cof_expiry_date),
      data.next_service_mileage || null,
      data.status || 'Available',
      data.status_description || '',

      !!data.has_jack,
      !!data.has_wheel_spanner,
      !!data.has_fire_extinguisher,
      !!data.has_triangles,
      !!data.has_spare_tyre,

      data.air_conditioner_working !== undefined ? !!data.air_conditioner_working : true,
      data.radio_working !== undefined ? !!data.radio_working : true,
      data.lights_working !== undefined ? !!data.lights_working : true,
      data.windows_working !== undefined ? !!data.windows_working : true,
      data.doors_working !== undefined ? !!data.doors_working : true,
    ];

    let result;
    
    if (isEditMode) {
      // UPDATE existing car
      const updateQuery = `
        UPDATE car_details 
        SET 
          make = ?, model = ?, color = ?, fuel_type = ?, mileage = ?, engine_capacity = ?,
          last_service_date = ?, insurance_cof_expiry_date = ?, next_service_mileage = ?, 
          status = ?, status_description = ?,
          has_jack = ?, has_wheel_spanner = ?, has_fire_extinguisher = ?, has_triangles = ?, 
          has_spare_tyre = ?,
          air_conditioner_working = ?, radio_working = ?, lights_working = ?, windows_working = ?, 
          doors_working = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE registration_number = ?
      `;

      const updateValues = [...values, registrationNumber];
      [result] = await db.query(updateQuery, updateValues);

      res.status(200).json({ 
        message: 'Car updated successfully', 
        carId: registrationNumber,
        affectedRows: result.affectedRows 
      });
    } else {
      // INSERT new car
      const insertQuery = `
        INSERT INTO car_details (
          registration_number, make, model, color, fuel_type, mileage, engine_capacity,
          last_service_date, insurance_cof_expiry_date, next_service_mileage, status, status_description,
          has_jack, has_wheel_spanner, has_fire_extinguisher, has_triangles, has_spare_tyre,
          air_conditioner_working, radio_working, lights_working, windows_working, doors_working
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertValues = [registrationNumber, ...values];
      [result] = await db.query(insertQuery, insertValues);

      res.status(201).json({ 
        message: 'Car added successfully', 
        carId: result.insertId 
      });
    }

  } catch (err) {
    console.error(`Error ${isEditMode ? 'updating' : 'adding'} car:`, err);
    
    // Handle duplicate entry error for new cars
    if (!isEditMode && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Car already exists', 
        details: `Car with registration number ${registrationNumber} already exists in the system` 
      });
    }

    res.status(500).json({ 
      error: `Failed to ${isEditMode ? 'update' : 'add'} car`, 
      details: err.message 
    });
  }
});

export default router;