// /api/resetServiceMileage.js
import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

// POST /api/resetServiceMileage
router.post('/', async (req, res) => {
  const { carId } = req.body;

  if (!carId) {
    return res.status(400).json({ error: 'carId is required' });
  }

  try {
    const db = await connectDB();

    const [result] = await db.query(`
      UPDATE car_details
      SET next_service_mileage = 0
      WHERE id = ? AND is_deleted = false
    `, [carId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Car not found or it is in deleted state' });
    }

    res.json({ message: 'Service mileage reset successfully' });
  } catch (err) {
    console.error('Reset service mileage error:', err);
    res.status(500).json({ error: 'Failed to reset service mileage' });
  }
});

export default router;
