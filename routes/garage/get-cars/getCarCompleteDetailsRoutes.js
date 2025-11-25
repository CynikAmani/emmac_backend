import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await connectDB();
  const { registration_number } = req.query;

  if (!registration_number) {
    return res.status(400).json({ error: 'Registration number is required' });
  }

  try {
    const query = `
      SELECT *
      FROM car_details
      WHERE registration_number = ?
      LIMIT 1
    `;

    const [rows] = await db.query(query, [registration_number]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error fetching car details:', err);
    res.status(500).json({ error: 'Failed to fetch car details', details: err.message });
  }
});

export default router;
