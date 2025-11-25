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
        model,
        color,
        fuel_type,
        mileage,
        engine_capacity,
        status,
        next_service_mileage
      FROM car_details
      ORDER BY created_at DESC
    `;

    const [rows] = await db.query(query);

    // Optional computed field for easier frontend rendering
    const catalog = rows.map(car => ({
      ...car,
      display_name: `${car.make} ${car.model} (${car.color || 'N/A'})`
    }));

    res.status(200).json(catalog);
  } catch (err) {
    console.error('Error fetching car catalog:', err);
    res.status(500).json({ error: 'Failed to fetch car catalog', details: err.message });
  }
});

export default router;
