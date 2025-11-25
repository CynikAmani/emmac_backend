// /api/updateInsuranceExpiryDate.js
import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

// POST /api/updateInsuranceExpiryDate
router.post('/', async (req, res) => {
  const { carId, nextExpiryDate } = req.body;

  if (!carId || !nextExpiryDate) {
    return res.status(400).json({ error: 'carId and nextExpiryDate are required' });
  }

  try {
    const db = await connectDB();

    const [result] = await db.query(`
      UPDATE car_details
      SET insurance_cof_expiry_date = ?
      WHERE id = ? AND is_deleted = false
    `, [nextExpiryDate, carId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Car not found or already deleted' });
    }

    res.json({ message: 'Insurance/COF expiry date updated successfully' });
  } catch (err) {
    console.error('Update insurance expiry error:', err);
    res.status(500).json({ error: 'Failed to update insurance expiry date' });
  }
});

export default router;
