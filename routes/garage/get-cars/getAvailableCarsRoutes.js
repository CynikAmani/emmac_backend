import express from 'express';
import { connectDB } from '../../../config/db/connect.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await connectDB();

  try {
    const query = `
      SELECT
        id,
        registration_number,
        make,
        model
      FROM car_details
      WHERE LOWER(status) = LOWER('Available')
      ORDER BY created_at DESC
    `;

    const [rows] = await db.query(query);

    // Build clean dropdown label
    const catalog = rows.map(car => ({
      id: car.id,
      registration_number: car.registration_number,
      make: car.make,
      model: car.model,
      name: `${car.make} ${car.model} (${car.registration_number})`
    }));

    res.status(200).json(catalog);
  } catch (err) {
    console.error('Error fetching available cars:', err);
    res.status(500).json({ error: 'Failed to fetch available cars', details: err.message });
  }
});

export default router;
