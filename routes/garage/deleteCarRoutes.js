import express from 'express';
import { connectDB } from '../../config/db/connect.js';

const router = express.Router();

// POST /api/deleteCar - Soft delete (mark as deleted)
router.post('/', async (req, res) => {
  const db = await connectDB();
  const { registration_number } = req.body;

  if (!registration_number) {
    return res.status(400).json({ 
      error: 'Registration number is required' 
    });
  }

  try {
    // First, check if the car exists and is not already deleted
    const [existingCar] = await db.query(
      'SELECT registration_number, is_deleted FROM car_details WHERE registration_number = ?',
      [registration_number]
    );

    if (existingCar.length === 0) {
      return res.status(404).json({ 
        error: 'Car not found', 
        details: `Car with registration number ${registration_number} does not exist` 
      });
    }

    if (existingCar[0].is_deleted) {
      return res.status(409).json({ 
        error: 'Car already deleted', 
        details: `Car with registration number ${registration_number} is already marked as deleted` 
      });
    }

    // Perform the soft delete - mark as deleted
    const [result] = await db.query(
      `UPDATE car_details 
       SET 
         is_deleted = TRUE,
         status = 'Inactive',
         updated_at = CURRENT_TIMESTAMP
       WHERE registration_number = ?`,
      [registration_number]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ 
        error: 'Failed to delete car', 
        details: 'No rows were affected by the update' 
      });
    }

    res.status(200).json({ 
      message: 'Car deleted successfully',
      details: 'Car has been marked as deleted and set to Inactive status',
      registration_number,
      affectedRows: result.affectedRows
    });

  } catch (err) {
    console.error('Error deleting car:', err);
    res.status(500).json({ 
      error: 'Failed to delete car', 
      details: err.message 
    });
  }
});

export default router;